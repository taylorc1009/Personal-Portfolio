animator = {
	initialiseAnimations: () => {
		animator.initialiseVectorAnimations();
		animator.initialiseCardsAnimations();
	},

	getVectorAnimationDuration: (svg) => { //delay, delay_between_letters, duration_per_letter) => {
		const isHeading = svg.className === "heading-svg";
		const delay = isHeading ? mathematics.heading_svg_dbl : mathematics.delay_between_letters;
		const duration = isHeading ? mathematics.heading_svg_dpl : mathematics.duration_per_letter;
		return (delay * svg.childElementCount) + duration;
	},

	initialiseVectorAnimations: () => {
		const svgs = document.getElementsByClassName("text-as-svg");
		let delay = 0, currentFlexRow = 0, totalAnimationDuration = 0; //these are used to reset the delay of animating the next SVG when it's in the next flexbox row or another SVG class; "totalAnimationDuration" is used to delay the vector fill animation for each SVG (in the same class) until all SVG stroke animations (in that class) are finished
		let previousSVGClass = svgs[0].classList[1]; //used to record the previous SVG being initialised in the loop; the previous SVG is recorded as once each SVG in the same class is initialised, we need to give them all the same time delay on their fill animations so the can all fade in at the same time
		var introPrevented = false; //this is used to prevent the "initialiseHeadingAnimation" function from triggering (at the bottom of this function) if the heading animation is prevented

		for (let i = 0; i < svgs.length; i++) {
			const vectors = svgs[i].children; //document.querySelectorAll(`#${svgs[i].id} path`);
	
			//these are used to determine whether or not to skip or pause animations if the elements are off-screen
			var isHeading = svgs[i].classList.contains("heading-svg"); //the heading is animated differently; the duration is longer to give it a nicer effect
			var isVisible = mathematics.isOnScreen(svgs[i]); //if a vector is not currently within the user's viewport, this is used to pause the animation until the user scrolls to the vector
			var preventIntro = isHeading && !isVisible; //the intro animation should be prevented if it's off screen: it didn't seem necessary to have to run the slow heading animation if the user refreshes the page half way down and scrolls to the top
			if (preventIntro)
				introPrevented = true;
	
			for (let j = 0; j < vectors.length; j++) {
				var pathLength = vectors[j].getTotalLength(); //gets the length of the SVG path's stroke
	
				$(`#${vectors[j].id}`).css({
					'stroke-dasharray': `${pathLength}`,
					'stroke-dashoffset': `${preventIntro ? 0 : pathLength}`
				})
			}
			$(`#${svgs[i].id}`).css({
				'fill': `${preventIntro ? 'rgba(var(--color-pure-white))' : 'rgba(var(--color-transparent))'}`
			});

			//if the current SVG belongs to a new SVG class or it's in a new row within a flexbox, reset it's stroke animation delay to zero seconds
			if (!svgs[i].classList.contains(previousSVGClass) || mathematics.calculateFlexChildRow(svgs[i].parentElement, svgs[i]) > currentFlexRow)
				delay = 0;

			animator.determineVectorAnimationState(svgs[i], isVisible, isHeading, delay);
			/*if (isVisible) //if the SVG is already on screen, run the animation: preventing the animation waiting for the user to scroll to it...
				animator.animateVectorStroke(svgs[i], delay);
			else { //... otherwise, either...
				if (isHeading) //make the heading's subheading elements visible; "SOFTWARE ENGINEER" and the SVG icon
					animator.initialiseHeadingAnimation(isVisible, undefined);
				else //append it to the list of animations pending a positive visibility ("isOnScreen") check
					animationsCollection.animations.push({method: animator.vectorOnScrollEvent, args: [svgs[i]]}); //adds the animate SVG stroke function to the list of pending animations, with its respective arguments (being the SVG to be animated)
			}*/

			delay += animator.getVectorAnimationDuration(svgs[i]); //add the duration of this vector's stroke animation to the delay of animating the next vector's stroke
			if (i !== svgs.length - 1 && delay > totalAnimationDuration) //this is used to keep track of the highest delay recorded for this SVG class; the highest delay will be the flexbox row that takes the longest to animate (due to having more letters), and we then use this highest delay to delay each SVG in this class's vector fill animation: once every row's letter's stroke has been animated in
				totalAnimationDuration = delay;
			
			if (!svgs[i].classList.contains(previousSVGClass)) { //if we're now iterating through a new SVG class, animate the previous class's vectors' fill
				animator.animateVectorFill(`.${previousSVGClass}`, totalAnimationDuration, isHeading)

				if (previousSVGClass === "heading-svg" && !introPrevented) //if the previous SVG class is the heading SVG class, we also want to animate in the subheadings ("SOFTWARE ENGINEER" and the SVG icon) in with the "totalAnimationDuration" as the delay as well
					animator.initialiseHeadingAnimation(true, totalAnimationDuration);

				//if (i === svgs.length - 1) //if this is the final SVG class we're iterating but it's also a new class, we need to initialise it's animations as there won't be another iteration of the loop
					//animator.determineVectorAnimationState(svgs[i], isVisible, isHeading, 0);
					//animator.animateVectorFill(`.${previousSVGClass}`, animator.getVectorAnimationDuration(svgs[i]), isHeading);
				//else
					previousSVGClass = svgs[i].classList[1];
			}
		}
	},

	determineVectorAnimationState: (svg, isVisible, isHeading, delay) => {
		if (isVisible) { //if the SVG is already on screen, run the animation: preventing the animation waiting for the user to scroll to it...
			animator.animateVectorStroke(svg, delay, isHeading);
			animator.animateVectorFill(`.${svg.classList[1]}`, delay + animator.getVectorAnimationDuration(svg), isHeading);
		}
		else { //... otherwise, either...
			if (isHeading) //make the heading's subheading elements visible; "SOFTWARE ENGINEER" and the SVG icon
				animator.initialiseHeadingAnimation(isVisible, undefined);
			else //append it to the list of animations pending a positive visibility ("isOnScreen") check
				animationsCollection.animations.push({method: animator.vectorOnScrollEvent, args: [svg, delay]}); //adds the animate SVG stroke function to the list of pending animations, with its respective arguments (being the SVG to be animated)
		}
	},

	initialiseHeadingAnimation: (isVisible, delay) => {
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

	initialiseCardsAnimations: () => {
		const cards = document.getElementsByClassName("card-container");
	
		for (let i = 0; i < cards.length; i++) {
			const svg = cards[i].parentElement.getElementsByClassName("text-as-svg")[0];

			if (mathematics.isOnScreen(svg)) //if the element is already on screen, this prevents the animation waiting for the user to scroll to it...
				$(`#${cards[i].id}`).css({
					'animation': `cards-reveal-animation ${mathematics.fade_in_duration}s ease forwards ${animator.getVectorAnimationDuration(svg)}s`
				});
			else //... otherwise, append it to the list of animations pending a positive visibility (on screen) check
				animationsCollection.animations.push({method: animator.cardsOnScrollEvent, args: [cards, svg]}); //adds this animate function to the list of pending animations, with its respective arguments
		}
	},

	cardsOnScrollEvent: (cards, svg) => {
		if (mathematics.isOnScreen(svg)) {
			for (let i = 0; i < cards.length; i++)
				$(`#${cards[i].id}`).css({
					'animation': `cards-reveal-animation ${mathematics.fade_in_duration}s ease forwards ${animator.getVectorAnimationDuration(svg)}s`
				});

			return true;
		}
		//return false; //shouldn't be needed as, at this point, the value returned will be 'undefined' which is the equivalent of 'false'
	},
	
	vectorOnScrollEvent: (svg, delay) => {
		if (mathematics.isOnScreen(svg)){
			const isHeading = svg.className === "heading-svg";

			animator.animateVectorStroke(svg, delay, isHeading);
			animator.animateVectorFill(`.${svg.classList[1]}`, delay + animator.getVectorAnimationDuration(svg), isHeading);
			
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
	animations: [], //this is a list of methods which invoke pending animations

	deleteAnimation: (i) => { //we don't want the animation to run every time it's scrolled to so once it has ran, delete it
		const index = animationsCollection.animations[i];
		if (index !== -1)
			animationsCollection.animations.splice(index, 1);
	}
};

window.onscroll = () => { //I tried to use the "scroll" event listener instead of this, but the listener would be deleted after the users' first scroll, rendering it useless for this purpose
	for (let i = 0; i < animationsCollection.animations.length; i++)
		if (animationsCollection.animations[i].method.apply(this, animationsCollection.animations[i].args)) //'.apply()' unpacks the list of arguments required for this animation
			animationsCollection.deleteAnimation(i); //if this animation has begun (the animations' method returned 'true') then it is time to stop the animation from pending
}
