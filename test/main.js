animator = {
	getCurrentVectorAnimationDuration: (svg, isHeading) => {
		return (isHeading ? mathematics.heading_svg_dbl : mathematics.delay_between_letters) * (svg.childElementCount);
	},

	initialiseVectorAnimations: () => {
		const SVGGroups = Array.from(document.getElementsByClassName("text-as-svg")).reduce((groups, svg) => {
			const group = (groups[svg.classList[1]] || []);
			group.push(svg);
			groups[svg.classList[1]] = group;
			return groups;
		}, {});

		for(let [SVGGroup, SVGs] of Object.entries(SVGGroups)) {
			let //! currentFlexRow = 0,
				isVisible = mathematics.isOnScreen(SVGs[0].parentElement),
				isHeading = SVGGroup === "heading-svg",
				delay = 0,
				//! animationDuration = 0,
				current_dpl = (isHeading ? mathematics.heading_svg_dpl : mathematics.duration_per_letter),
				totalAnimationDuration = SVGs.length === 1 ? animator.getCurrentVectorAnimationDuration(SVGs[0], isHeading) + current_dpl : current_dpl;

			if (isHeading) {
				wavesSVG = document.getElementById("waves");
				for (let [i, wave] of Array.from(wavesSVG.children).entries()) {
					let duration = 20 + Math.random() * 70;
					$(`#${wave.id}`).css({
						'animation': `${i % 2 ? 'wave-animation' : 'wave-animation-reverse'} ${duration}s infinite ease-in-out`
					});
				}
			}

			for(let [i, SVG] of SVGs.entries()) {
				animator.hideVectorPaths(SVG, isHeading && !isVisible);

				//! uncomment this and blocks marked "!" to enable multi-line starts in text SVG animations
				/* nextFlexRow = mathematics.calculateFlexChildRow(SVG);
				if(nextFlexRow > currentFlexRow) {
					delay = 0;
					currentFlexRow = nextFlexRow;
				}*/

				animationDuration = animator.getCurrentVectorAnimationDuration(SVG, isHeading);
				if(SVGs.length > 1) //! disable this code block when enabling multi-line animations
					totalAnimationDuration += animationDuration;
				animator.determineVectorAnimationState(
					SVG,
					SVGGroup,
					isVisible,
					isHeading,
					delay,
					//! Math.max(delay + animationDuration + current_dpl, totalAnimationDuration)
					totalAnimationDuration //! disable this when enabling multi-line animations
				);
				if(SVGs.length > 1) //! disable this code block when enabling multi-line animations
					delay += animationDuration;

				//!
				/*if(SVGs.length > 1) {
					delay += animationDuration;
					if(delay + current_dpl > totalAnimationDuration) {
						totalAnimationDuration = delay + current_dpl;
						if(i === SVGs.length - 1)
							totalAnimationDuration += current_dpl;
					}
				}*/
			}

			if (isVisible) {
				for (const animation of animator.getSVGsParentsChildren(SVGs[0].parentElement)) {
					animation.args.push(totalAnimationDuration);
					animation.method.apply(this, animation.args);
				}
				animator.animateVectorFill(
					`.${SVGGroup}`,
					totalAnimationDuration,
					isHeading
				);
				if (isHeading)
					animator.initialiseSubheadingAnimation(
						true,
						totalAnimationDuration
					);
			}
		}
	},

	determineVectorAnimationState: (svg, svgClass, isVisible, isHeading, delay, totalAnimationDuration) => {
		if (isVisible) //if the SVG is already on screen, run the animation: preventing the animation waiting for the user to scroll to it...
			animator.animateVectorStroke(svg, delay, isHeading);
		else { //... otherwise, either...
			if (isHeading) //make the heading's subheading elements visible; "SOFTWARE ENGINEER" and the SVG icon
				animator.initialiseSubheadingAnimation(isVisible, undefined);
			else if(!animationsCollection.animations[svgClass])
				animationsCollection.animations[svgClass] = {
					method: animator.vectorOnScrollEvent,
					args: [
						svg.parentElement,
						svgClass,
						[delay],
						totalAnimationDuration,
						animator.getSVGsParentsChildren(svg.parentElement)
					]
				};
			else {
				animationsCollection.animations[svgClass].args[2].push(delay);
				if(totalAnimationDuration > animationsCollection.animations[svgClass].args[3])
					animationsCollection.animations[svgClass].args[3] = totalAnimationDuration;
			}
		}
	},

	getSVGsParentsChildren: (SVGContainer) => { //returns the list of elements that are in the same container as an SVG container (so they can be animated in with the SVG fill animation)
		var containerSiblingsAnimations = [];
		
		for (let sibling of SVGContainer.parentElement.children)
			if (sibling != SVGContainer)
				containerSiblingsAnimations.push({method: animator.animateSiblings, args: [sibling]});

		return containerSiblingsAnimations;
	},

	hideVectorPaths: (svg, preventIntro) => {
		const paths = svg.children;

		for (let j = 0; j < paths.length; j++) {
			var pathLength = paths[j].getTotalLength(); //gets the length of the SVG path's stroke

			$(`#${paths[j].id}`).css({
				'stroke-dasharray': `${pathLength}`,
				'stroke-dashoffset': `${preventIntro ? 0 : pathLength}`,
				'stroke-opacity': '1'
			});
		}
		$(`#${svg.id}`).css({
			'fill': `${preventIntro ? 'rgba(var(--color-pure-white))' : 'rgba(var(--color-transparent))'}`
		});
	},

	initialiseSubheadingAnimation: (isVisible, delay) => {
		if(isVisible) { //checks whether the heading is out of sight or not...
			//... if it isn't, animate all the heading elements...
			$('#heading-text').css({
				'animation': `text-reveal-animation 1s ease forwards ${delay}s`
			});
			$('#heading-icon').css({
				'animation': `vector-reveal-animation 1s ease forwards ${delay}s`
			});
		}
		else { //... if it is out of sight, I don't want the animation to waste resources and I also don't want it to happen when it's scrolled to by the user, so just prevent it
			//we therefore need to skip the animations of the other subheading elements as well and make them visible
			$('#heading-text').css({
				'color': 'rgba(var(--color-pure-white))',
				'margin-top': 0,
				'margin-bottom': '10px'
			});
			$('#heading-icon').css({
				'fill-opacity': 1,
				'margin-top': 0,
				'margin-bottom': '10px'
			});
		}
	},

	animateVectorStroke: (svg, delay, isHeading) => {
		const vectors = svg.children;

		for (let i = 0; i < vectors.length; i++)
			$(`#${vectors[i].id}`).css({
				'animation': `vector-stroke-animation ${isHeading ? mathematics.heading_svg_dpl : mathematics.duration_per_letter}s ease forwards ${delay + (isHeading ? mathematics.heading_svg_dbl : mathematics.delay_between_letters) * i}s`
			});
	},

	animateVectorFill: (identifier, delay, isHeading) => {
		$(`${identifier}`).css({
			'animation': `vector-fill-animation ${isHeading ? mathematics.heading_svg_fid : mathematics.fade_in_duration}s ease forwards ${delay}s`
		});
	},

	animateSiblings: (siblingElement, delay) => {
		$(siblingElement).css({
			'animation': `svg-sibling-reveal-animation ${mathematics.fade_in_duration}s ease forwards ${delay}s`
		});
	},
		
	vectorOnScrollEvent: (svgClassContainer, svgClass, delays, totalAnimationDuration, containerSiblingsAnimations) => {
		if (mathematics.isOnScreen(svgClassContainer)){
			//the "isHeading" parameter is false for both of these animations here because we will never animate the heading via a scroll listener
			for (let i = 0; i < svgClassContainer.childElementCount; i++)
				animator.animateVectorStroke(svgClassContainer.children[i], delays[i], false);

			animator.animateVectorFill(`.${svgClass}`, totalAnimationDuration, false);

			for (const animation of containerSiblingsAnimations) {
				animation.args.push(totalAnimationDuration);
				animation.method.apply(this, animation.args);
			}
			
			return true;
		}
		//return false; //shouldn't be needed as, at this point, the value returned will be 'undefined' which is the equivalent of 'false'
	},
}

mathematics = {
	//there's different animation durations for text vectors in the page body as we don't want the user to have to wait long for them to finish every time
	//the heading animation lasts longer and, as you can see, it's parameters begin with "heading_svg_"
	delay_between_letters: 0.1, //delay between the beginning of 1 letter stroke animation and the next letters' beginning
	duration_per_letter: 1.5, //duration it takes to animate 1 full letters' stroke
	fade_in_duration: 0.25, //duration of the SVG fill fade in effect
	heading_svg_dbl: 0.2,
	heading_svg_dpl: 2,
	heading_svg_fid: 0.5,

	isOnScreen: (elm) => { //used to determine if an element is on screen (credit - https://stackoverflow.com/a/5354536/11136104)
		let rect = elm.getBoundingClientRect();
		return !(rect.bottom < 0 || rect.top - Math.max(document.documentElement.clientHeight, window.innerHeight) >= 0);
	},

	calculateFlexChildRow: (item) => {
		let row = 0, previousHighestDistance = 0;
	
		for (let child of item.parentElement.children) {
			var parentTop = item.parentElement.getBoundingClientRect().top; //parent's top's distance from the top of the viewport
			var currentChildTop = child.getBoundingClientRect().top; //child's top's distance from the top of the viewport
	
			var childTopDistanceFromParentTop = Math.abs(parentTop - currentChildTop);
	
			if (childTopDistanceFromParentTop > previousHighestDistance) {
				row++;
				previousHighestDistance = childTopDistanceFromParentTop;
			}
			if (child === item)
				break;
		}
	
		return row;
	}
}

animationsCollection = { //contains a list of methods that begin animations when specific elements are scrolled down to
	animations: {}, //this is a list of methods which invoke pending animations

	deleteAnimation: (svgClass) => {
		if(animationsCollection.animations.hasOwnProperty(svgClass))
			delete animationsCollection.animations[svgClass];
	}
};

window.onscroll = () => { //I tried to use the "scroll" event listener instead of this, but the listener would be deleted after the user's first scroll, rendering it useless for this purpose
	for(const [key, value] of Object.entries(animationsCollection.animations))
		if (value.method.apply(this, value.args)) //'.apply()' unpacks the list of arguments required for this animation
			animationsCollection.deleteAnimation(key); //if this animation has begun (the animations' method returned 'true') then it is time to stop the animation from pending
}

miscellaneous = {
	copyrightNotice: () => {
		if (window.confirm('Bitmoji avatars are copyright Ⓒ protected by the Bitmoji organization. The owners have deemed it legal to reuse their artwork for non-commercial purposes. Would you like to view this information in their guidelines?')) 
			window.open('https://www.bitmoji.com/bitmoji_brand_guidelines.pdf#page=4', '_blank').focus();
	}
}
