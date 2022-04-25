animator = {
	getVectorAnimationDuration: (svg, isHeading) => {
		const delay = isHeading ? mathematics.heading_svg_dbl : mathematics.delay_between_letters;
		return svg.childElementCount * delay;
	},

	initialiseVectorAnimations: () => {
		const svgs = document.getElementsByClassName("text-as-svg");
		let delay = 0, currentFlexRow = 0, totalAnimationDuration = 0; //these are used to reset the delay of animating the next SVG when it's in the next flexbox row or another SVG class; "totalAnimationDuration" is used to delay the vector fill animation for each SVG (in the same class) until all SVG stroke animations (in that class) are finished
		let previousSVGClass = svgs[0].classList[1], currentSVGClass; //used to record the previous SVG being initialised in the loop; the previous SVG is recorded as once each SVG in the same class is initialised, we need to give them all the same time delay on their fill animations so they can all fade in at the same time (which can only be done once we've gathered the duration of each vector's, in that class', animation)
		let introPrevented = false; //this is used to prevent the "initialiseSubheadingAnimation" function from triggering if the heading animation is prevented

		for (let i = 0; i < svgs.length; i++) {	
			//these are used to determine whether or not to skip or pause animations if the elements are off-screen
			let isHeading = svgs[i].classList.contains("heading-svg"); //the heading is animated differently; the duration is longer to give it a nicer effect
			var isVisible, wasVisible = isVisible //"wasVisible" is used to determine (at the end of this function) if the previous vector class was visible to the user: 
			isVisible = mathematics.isOnScreen(svgs[i].parentElement); //if a vector is not currently within the user's viewport, isVisible is used to pause the animation until the user scrolls to the vector
			let preventIntro = isHeading && !isVisible; //the intro animation should be prevented if it's off screen: it didn't seem necessary to have to run the slow heading animation if the user refreshes the page half way down and scrolls to the top
			if (preventIntro)
				introPrevented = true;
			currentSVGClass = svgs[i].classList[1];

			animator.hideVectorPaths(svgs[i], preventIntro);

			//if the current SVG belongs to a new SVG class or it's in a new row within a flexbox, reset it's stroke animation delay to zero seconds
			if (!svgs[i].classList.contains(previousSVGClass) || mathematics.calculateFlexChildRow(svgs[i].parentElement, svgs[i]) > currentFlexRow)
				delay = 0;

			if(i === svgs.length - 1) { //this is used to delay the vector fill animation of the final SVG class: you can see it's the same as the code at the bottom of this loop, but for the final SVG, the code at the bottom isn't executed until after the final class's vector fill animation has already begun; so we need to update "totalAnimationDuration" of the final SVG class here before the fill animation starts
				let finalFillDelay = delay + animator.getVectorAnimationDuration(svgs[i], isHeading); //add the duration of this vector's stroke animation to the delay of animating the next vector's stroke
				if (finalFillDelay > totalAnimationDuration) //this is used to keep track of the highest delay recorded for this SVG class; the highest delay will be the flexbox row that takes the longest to animate (due to having more letters), and we then use this highest delay to delay each SVG in this class's vector fill animation: once every row's letter's stroke has been animated in
					totalAnimationDuration = finalFillDelay;
			}

			animator.determineVectorAnimationState(
				svgs[i], currentSVGClass, isVisible, isHeading, delay,
				totalAnimationDuration + (isHeading ? mathematics.heading_svg_dpl : mathematics.duration_per_letter)
			);

			if (!svgs[i].classList.contains(previousSVGClass) || i === svgs.length - 1) { //if we're now iterating through a new SVG class, animate the previous class's vectors' fill
				if(wasVisible) //only occurs when we're done initialising a vector class: once we have the duration of every letter's stroke animation and if the vector is on screen (if it's off screen, there's an onScroll event that will animate the fill instead), we need to use the duration to set the delay of which to start the vector fill animation
					animator.animateVectorFill(
						`.${previousSVGClass}`,
						totalAnimationDuration + (isHeading ? mathematics.heading_svg_dpl : mathematics.duration_per_letter),
						isHeading
					);

				if (previousSVGClass === "heading-svg" && !introPrevented) //if the previous SVG class is the heading SVG class, we also want to animate in the subheadings ("SOFTWARE ENGINEER" and the SVG icon) in with the "totalAnimationDuration" as the delay as well
					animator.initialiseSubheadingAnimation(true,
						totalAnimationDuration + (isHeading ? mathematics.heading_svg_dpl : mathematics.duration_per_letter)
					);

				if (isVisible)
					for (const animation of animator.getSVGContainerSiblingElements(svgs[i].parentElement)) {
						animation.args.push(totalAnimationDuration + (isHeading ? mathematics.heading_svg_dpl : mathematics.duration_per_letter));
						animation.method.apply(this, animation.args);
					}

				previousSVGClass = currentSVGClass;
				totalAnimationDuration = 0;
			}

			//this code is the same as the code in the "if(i === svgs.length -1)"; it's more efficient having these lines duplicated as moving them to a separate function creates more lines (as JavaScript can neither pass by reference nor return more than one value from a function)
			delay += animator.getVectorAnimationDuration(svgs[i], isHeading);
			if (delay > totalAnimationDuration)
				totalAnimationDuration = delay;
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
						animator.getSVGContainerSiblingElements(svg.parentElement)
					]
				};
			else {
				animationsCollection.animations[svgClass].args[2].push(delay);

				if(totalAnimationDuration > animationsCollection.animations[svgClass].args[3])
					animationsCollection.animations[svgClass].args[3] = totalAnimationDuration;
			}
		}
	},

	getSVGContainerSiblingElements: (container) => { //returns the list of elements that are in the same container as an SVG container (so they can be animated in with the SVG fill animation)
		var containerSiblingsAnimations = [];
		
		for (let sibling of container.parentElement.children)
			if (sibling != container && sibling.classList.contains("card-container")) //in the future, there will be more than just "card-container" classes that accompany an SVG container, so this line and the next are subject to change
				containerSiblingsAnimations.push({method: animator.animateCards, args: [sibling]});

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
			console.log($(paths[j].styles));
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

	animateCards: (cardsContainer, delay) => {
		$(cardsContainer).css({
			'animation': `cards-reveal-animation ${mathematics.fade_in_duration}s ease forwards ${delay}s`
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
		var rect = elm.getBoundingClientRect();
		var viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
		return !(rect.bottom < 0 || rect.top - viewHeight >= 0);
	},

	calculateFlexChildRow: (container, item) => {
		let row = 0, previousHighestDistance = 0;
	
		for (let child of container.children) {
			var parentTop = container.getBoundingClientRect().top; //parent's top's distance from the top of the viewport
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
