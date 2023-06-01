animator = {
	getAllTextSVGs: () => {
		return Array.from(document.getElementsByClassName("text-as-svg")).reduce((groups, SVG) => {
			const group = (groups[SVG.classList[1]] || []);
			group.push(SVG);
			groups[SVG.classList[1]] = group;
			return groups;
		}, {});
	},

	getCurrentVectorAnimationDuration: (SVG, isHeading) => {
		return (isHeading ? mathematics.heading_svg_dbl : mathematics.delay_between_letters) * (SVG.childElementCount);
	},

	/* //! this edition of the initialiseVectorAnimations function contains the multi-line animation trigger; the other edition will only animate one line of a responsive vector at a time
	initialiseVectorAnimations: () => {
		for(let [SVGClass, SVGs] of Object.entries(animator.getAllTextSVGs())) {
			let currentFlexRow = 0,
				isVisible = mathematics.isOnScreen(SVGs[0].parentElement),
				isHeading = SVGClass === "heading-svg",
				delay = 0,
				animationDuration = 0,
				current_dpl = (isHeading ? mathematics.heading_svg_dpl : mathematics.duration_per_letter),
				totalAnimationDuration = SVGs.length === 1 ? animator.getCurrentVectorAnimationDuration(SVGs[0], isHeading) + current_dpl : current_dpl;

			if (isHeading)
				animations.animateHeadingWaves();

			for(let SVG of SVGs) {
				animations.hideVectorPaths(SVG, isHeading && !isVisible);

				nextFlexRow = mathematics.calculateRowOfItemInFlex(SVG);
				if(nextFlexRow > currentFlexRow) {
					delay = 0;
					currentFlexRow = nextFlexRow;
				}

				animationDuration = animator.getCurrentVectorAnimationDuration(SVG, isHeading);
				animator.updatePendingAnimations(
					SVG,
					SVGClass,
					isVisible,
					isHeading,
					delay,
					Math.max(delay + animationDuration + current_dpl, totalAnimationDuration)
				);

				if(SVGs.length > 1) {
					delay += animationDuration;
					if(delay + current_dpl > totalAnimationDuration) {
						totalAnimationDuration = delay + current_dpl;
						if(i === SVGs.length - 1)
							totalAnimationDuration += current_dpl;
					}
				}
			}
		}
	},*/

	initialiseVectorAnimations: () => {
		animations.animateHeadingWaves();

		for(const [SVGClass, SVGs] of Object.entries(animator.getAllTextSVGs())) {
			let isVisible = mathematics.isOnScreen(SVGs[0].parentElement),
				isHeading = SVGClass === "heading-svg",
				delay = 0,
				current_dpl = isHeading ? mathematics.heading_svg_dpl : mathematics.duration_per_letter,
				totalAnimationDuration = SVGs.length === 1 ? animator.getCurrentVectorAnimationDuration(SVGs[0], isHeading) + current_dpl : current_dpl;

			for(const SVG of SVGs) {
				animations.hideVectorPaths(SVG, isHeading && !isVisible);

				animationDuration = animator.getCurrentVectorAnimationDuration(SVG, isHeading);
				if (SVGs.length > 1) //this must happen before "updatePendingAnimations" so that we get the correct delay for the fill's fade-in animation
					totalAnimationDuration += animationDuration;

				if (isVisible) //if the SVG is already on screen, run the animation: preventing the animation waiting for the user to scroll to it...
					animations.animateVectorsStrokes(SVG, delay, isHeading);
				else if (!isHeading)
					animator.updatePendingAnimations(SVG, SVGClass, delay, totalAnimationDuration);

				if(SVGs.length > 1) //this must happen after "animateVectorsStrokes" so that we begin applying the stroke animation delay (between words) after the animations begin, not before
					delay += animationDuration;
			}

			if (isVisible)
				animator.postVectorStrokeAnimEvents(SVGs, SVGClass, totalAnimationDuration, isHeading); //any animations that should occur after the SVG's stoke animations (e.g. the fill animation)
			else if (isHeading)
				animations.initialiseSubheadingAnimation(false, undefined); //make the heading's subheading elements visible; "SOFTWARE ENGINEER" and the SVG icon
		}
	},

	updatePendingAnimations: (SVG, SVGClass, delay, totalAnimationDuration) => {
		if(!pendingAnimations.queue[SVGClass]) //if the SVG's animation is not currently pending (i.e. waiting for the SVG to be on-screen)...
			pendingAnimations.queue[SVGClass] = { //... add it to the list of pending animations with the necessary arguments and set the scroll handler as the response to the now-on-screen trigger
				method: animator.onScrollHandler,
				args: [
					SVG.parentElement,
					SVGClass,
					[delay],
					totalAnimationDuration,
					animator.getSVGsSiblingsAnimations(SVG.parentElement) //acquire the list of animations that need to be applied to the SVGs sibling elements, after the SVG's stroke animation finishes (such as the fade-in)
				]
			};
		else { //... otherwise, we need to list the duration of the animation for the current word in the text SVG group, so we can stagger the start of the animation for the next word (thanks to the "else if" above, this won't happen for SVG groups with only one word)
			pendingAnimations.queue[SVGClass].args[2].push(delay);
			/* //! this "if" is for when using the multi-line animation trigger in initialiseVectorAnimations
			if(totalAnimationDuration > pendingAnimations.queue[SVGClass].args[3])*/
			pendingAnimations.queue[SVGClass].args[3] = totalAnimationDuration;
		}
	},

	getSVGsSiblingsAnimations: (SVGContainer) => { //returns the list of elements that are in the same container as a text SVG's container (so their animations can begin at the same time as the SVG fill animation)
		let SVGSiblingsAnimations = [];

		for (const sibling of SVGContainer.parentElement.children)
			if (sibling != SVGContainer)
				SVGSiblingsAnimations.push({method: animations.fadeInSiblings, args: [sibling]});

		return SVGSiblingsAnimations;
	},

	postVectorStrokeAnimEvents: (SVGs, SVGClass, totalAnimationDuration) => {
		animations.animateVectorFill(SVGClass, totalAnimationDuration);

		for (const animation of animator.getSVGsSiblingsAnimations(SVGs[0].parentElement)) {
			animation.args.push(totalAnimationDuration);
			animation.method.apply(this, animation.args);
		}

		switch (SVGClass) { //unique post-stroke-animation animations (e.g. sub-heading after the heading stroke animation)
			case "heading-svg":
				animations.initialiseSubheadingAnimation(true, totalAnimationDuration);
				break;
			case "aspirations-svg":
				animations.animateIDE(totalAnimationDuration);
				break;
		}
	},

	onScrollHandler: (SVGsContainer, SVGClass, delays, totalAnimationDuration) => {
		if (mathematics.isOnScreen(SVGsContainer)) {
			//the "isHeading" parameter is false for both of these animations here because we will never animate the heading via a scroll listener
			for (let i = 0; i < SVGsContainer.childElementCount; i++)
				animations.animateVectorsStrokes(SVGsContainer.children[i], delays[i], false);

			animator.postVectorStrokeAnimEvents(SVGsContainer.children, SVGClass, totalAnimationDuration)
			
			return true;
		}
		//return false; //shouldn't be needed as, at this point, the value returned will be 'undefined' which is the equivalent of 'false'
	},
}

animations = {
	animateVectorFill: (SVGClass, delay) => {
		$(`.${SVGClass}`).css({
			'animation': `vector-fill-animation ${SVGClass === "heading-svg" ? mathematics.heading_svg_fid : mathematics.fade_in_duration}s ease forwards ${delay}s`
		});
	},

	fadeInSiblings: (siblingElement, delay) => {
		$(siblingElement).css({
			'animation': `svg-sibling-reveal-animation ${mathematics.fade_in_duration}s ease forwards ${delay}s`
		});
	},

	hideVectorPaths: (SVG, preventIntro) => {
		const paths = SVG.children;

		for (const path of paths) {
			const pathLength = path.getTotalLength(); //gets the length of the SVG path's stroke

			$(`#${path.id}`).css({
				'stroke-dasharray': `${pathLength}`,
				'stroke-dashoffset': `${preventIntro ? 0 : pathLength}`,
				'stroke-opacity': '1'
			});
		}

		$(`#${SVG.id}`).css({
			'fill': `${preventIntro ? 'rgba(var(--color-pure-white))' : 'rgba(var(--color-transparent))'}`
		});
	},

	initialiseSubheadingAnimation: (isVisible, delay) => {
		if(isVisible) //checks whether the heading is out of sight or not...
			//... if it isn't, animate all the heading elements...
			$('#heading-item-2').css({
				'animation': `subheading-reveal-animation 1s ease forwards ${delay}s`
			});
		else //... if it is out of sight, I don't want the animation to waste resources and I also don't want it to happen when it's scrolled to by the user, so just prevent it
			//we therefore need to skip the animations of the other subheading elements as well and make them visible
			$('#heading-item-2').css({
				'opacity': 1,
			});
	},

	animateHeadingWaves: () => {
		for (const [i, wave] of Array.from(document.getElementById("waves").children).entries())
			$(`#${wave.id}`).css({
				'animation': `${i % 2 ? 'wave-animation' : 'wave-animation-reverse'} ${60 + (i + 1) * 3}s infinite ease-in-out`
			});
	},

	animateVectorsStrokes: (SVG, delay, isHeading) => {
		const vectors = SVG.children;

		for (let i = 0; i < vectors.length; i++)
			$(`#${vectors[i].id}`).css({
				'animation': `vector-stroke-animation ${isHeading ? mathematics.heading_svg_dpl : mathematics.duration_per_letter}s ease forwards ${delay + (isHeading ? mathematics.heading_svg_dbl : mathematics.delay_between_letters) * i}s`
			});
	},

	animateIDE: async (SVGAnimationDuration) => {
		await mathematics.sleep(SVGAnimationDuration * 1000);

		const ideCode = document.getElementById("ide-code"),
			  ideLineNumbers = document.getElementById("ide-line-numbers"),
			  stringsAndHighlights = [ //Nx2 matrix structure: first value is the CSS class which entails the syntax highlighting of the string, second is the string/code (null/"\n" indicates a new line)
				  ["ide-code-keyword", "#include "], ["ide-code-string", "<iostream>"], [null, "\n"],
				  [null, "\n"],
				  ["ide-code-keyword", "int "], ["ide-code-function", "main("], ["ide-code-keyword", "int "], ["ide-code-parameter", "argc"], ["ide-code-standard", ", "], ["ide-code-keyword", "char"], ["ide-code-operator", "** "], ["ide-code-parameter", "argv"], ["ide-code-function", ") {"], [null, "\n"],
				  ["ide-code-standard", "\u00a0\u00a0\u00a0\u00a0std::cout "], ["ide-code-operator", "<< "], ["ide-code-string", "\"Prepare to run some really bad code!\""], ["ide-code-standard", ";"], [null, "\n"],
				  ["ide-code-function", "}"]
			  ];

		//add the first line number - the loop will start on this line and only ever add new line numbers when there's a new line in stringsAndHighlights
		miscellaneous.createElement({type: "li", innerText: "1", parent: ideLineNumbers});
		let element,
			lines = 1;
		for (const [i, [className, string]] of stringsAndHighlights.entries()) {
			if (className && string !== "\n") {
				element = miscellaneous.createElement({type: "span", className: className, parent: ideCode});

				$(element).css({ //gives the effect of having a text cursor
					'border-right': '2px solid white'
				});

				for (const char of string) {
					element.textContent += char;
					await mathematics.sleep(mathematics.ide_code_dbl);
				}

				if (i < stringsAndHighlights.length) //don't remove the cursor effect from the last element as this is given an idle cursor animation once all strings have been outputted
					$(element).css({ //removes the text cursor effect from "element" after the HTML element has been fully populated by the "string" variable, ready for the next element to have the cursor
						'border-right': 'none'
					});
			}
			else {
				miscellaneous.createElement({type: "br", parent: ideCode});
				miscellaneous.createElement({type: "li", innerText: (++lines).toString(), parent: ideLineNumbers});
			}
		}

		$(element).css({ //applies the idle text cursor animation
			'animation': `ide-text-cursor-animation 2s infinite`
		});
	},
}

pendingAnimations = { //contains a list of methods that begin animations when specific elements are scrolled down to
	queue: {}, //this is a list of methods which invoke pending animations

	deleteAnimation: (SVGClass) => {
		if(pendingAnimations.queue.hasOwnProperty(SVGClass))
			delete pendingAnimations.queue[SVGClass];
	}
};

mathematics = {
	//there's different animation durations for text vectors in the page body as we don't want the user to have to wait long for them to finish every time
	//the heading animation lasts longer and, as you can see, it's parameters begin with "heading_svg_"
	delay_between_letters: 0.1, //delay (s) between the beginning of 1 letter stroke animation and the next letters' beginning
	duration_per_letter: 1.5, //duration (s) of one full letters' stroke animation
	fade_in_duration: 0.25, //duration (s) of the SVG fill's fade in effect
	heading_svg_dbl: 0.2,
	heading_svg_dpl: 2,
	heading_svg_fid: 0.5,
	ide_code_dbl: 65, //delay (ms) between adding the next letter to the IDE code

	isOnScreen: (elm) => { //used to determine if an element is on screen (credit - https://stackoverflow.com/a/5354536/11136104)
		const rect = elm.getBoundingClientRect();
		return !(rect.bottom < 0 || rect.top - Math.max(document.documentElement.clientHeight, window.innerHeight) >= 0);
	},

	/*calculateRowOfItemInFlex: (item) => {
		let row = 0, previousHighestDistance = 0;
	
		for (let child of item.parentElement.children) {
			let parentTop = item.parentElement.getBoundingClientRect().top, //parent's top's distance from the top of the viewport
				currentChildTop = child.getBoundingClientRect().top, //child's top's distance from the top of the viewport
				childTopDistanceFromParentTop = Math.abs(parentTop - currentChildTop);
	
			if (childTopDistanceFromParentTop > previousHighestDistance) {
				row++;
				previousHighestDistance = childTopDistanceFromParentTop;
			}

			if (child === item)
				break;
		}
	
		return row;
	},*/

	sleep: (ms) => {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}

window.onscroll = () => { //I tried to use the "scroll" event listener instead of this, but the listener would be deleted after the user's first scroll, rendering it useless for this purpose
	for(const [key, value] of Object.entries(pendingAnimations.queue))
		if (value.method.apply(this, value.args)) //executes the "animator.onScrollHandler" - '.apply()' unpacks the list of arguments required for this animation
			pendingAnimations.deleteAnimation(key); //if this animation has begun (the animations' method returned 'true') then it is time to stop the animation from pending
}

miscellaneous = {
	copyrightNotice: () => {
		if (window.confirm('Bitmoji avatars are copyright Ⓒ protected by the Bitmoji organization. The owners have deemed it legal to reuse their artwork for non-commercial purposes. Would you like to view this information in their guidelines?')) 
			window.open('https://www.bitmoji.com/bitmoji_brand_guidelines.pdf#page=4', '_blank').focus();
	},

	createElement: ({type, className=null, innerText=null, parent=null}={}) => {
		let element = document.createElement(type);

		if (className)
			element.className = className;
		if (innerText)
			element.innerText = innerText;
		if (parent)
			parent.appendChild(element);

		return element;
	}
}
