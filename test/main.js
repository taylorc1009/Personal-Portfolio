calculateFlexChildRow = (container, item) => {
	let row = 0, previousHighestDistance = 0;

	for (let child of container.children) {
		var parentTop = container.getBoundingClientRect().top; // Initial parent's top distance from the top of the viewport;
		var currentChildTop = child.getBoundingClientRect().top; // Initial child's top distance from the top of the viewport;

		var childTopDistanceFromParentTop = Math.abs(parentTop - currentChildTop);
		//var scrolledParentDistance = Math.abs(parentTop - container.getBoundingClientRect().top);
		//var distance = childTopDistanceFromParentTop - scrolledParentDistance;

		//console.log(currentChildTop);
		if (childTopDistanceFromParentTop > previousHighestDistance) {
			row++;
			previousHighestDistance = childTopDistanceFromParentTop;
		}
		if (child === item)
			break;
	}

	return row;
}

animator = {
	delay_between_letters: 0.1, //delay between the beginning of 1 letter stroke animation and the next letters' beginning
	duration_per_letter: 1.5, //duration it takes to animate 1 full letters' stroke
	fade_in_duration: 0.25, //duration of the SVG fill fade in effect
	heading_svg_dbl: 0.2,
	heading_svg_dpl: 2,
	heading_svg_fid: 0.5,

	initialiseAnimations: () => {
		animator.initialiseVectorAnimations();
		animator.initialiseCardsAnimations();
	},

	getVectorAnimationDuration: (svg) => { //delay, delay_between_letters, duration_per_letter) => {
		const isHeading = svg.className === "heading-svg";
		const delay = isHeading ? animator.heading_svg_dbl : animator.delay_between_letters;
		const duration = isHeading ? animator.heading_svg_dpl : animator.duration_per_letter;
		return (delay * svg.childElementCount) + duration;
	},

	initialiseVectorAnimations: () => {
		const svgs = document.getElementsByClassName("text-as-svg");
		let delay = 0, currentFlexRow = 0, totalAnimationDuration = 0; //these are used to reset the delay of animating the next word in when it's in the next flexbox row
		let previousSVGClass = svgs[0].classList[1];

		for (let i = 0; i < svgs.length; i++) {
			const vectors = svgs[i].children; //document.querySelectorAll(`#${svgs[i].id} path`);
	
			//these are used to determine whether or not to skip the intro animation: if the elements are off-screen
			var isHeading = svgs[i].classList.contains("heading-svg");
			var isVisible = animator.isOnScreen(svgs[i]);
			var preventIntro = isHeading && !isVisible;
	
			for (let j = 0; j < vectors.length; j++) {
				var pathLength = vectors[j].getTotalLength(); //gets the full outer path length of the SVG
	
				$(`#${vectors[j].id}`).css({
					'stroke-dasharray': `${pathLength}`,
					'stroke-dashoffset': `${preventIntro ? 0 : pathLength}`
				})
			}
			$(`#${svgs[i].id}`).css({
				'fill': `${preventIntro ? 'rgba(var(--color-pure-white))' : 'rgba(var(--color-transparent))'}`
			});

			if (!svgs[i].classList.contains(previousSVGClass) || calculateFlexChildRow(svgs[i].parentElement, svgs[i]) > currentFlexRow)
				delay = 0;

			//if (isHeading) //the heading is animated differently; the duration is longer to give it a nicer effect
				//animator.initialiseHeadingAnimation(svgs[i], isVisible, delay);
			//else { //we use a different animation for text vectors in the body as we don't want the user to have to wait long for it to finish before they can do things
				if (isVisible) //if the element is already on screen, this prevents the animation waiting for the user to scroll to it...
					animator.animateVectorStroke(svgs[i], delay);
				else if (!isHeading) //... otherwise, append it to the list of animations pending a positive visibility (on screen) check
					animationsCollection.animations.push({method: animator.vectorOnScrollEvent, args: [svgs[i]]}); //adds this animate function to the list of pending animations, with its respective arguments
			//}

			delay += animator.getVectorAnimationDuration(svgs[i]);
			if (i !== svgs.length - 1 && delay > totalAnimationDuration)
				totalAnimationDuration = delay;
			
			if (!svgs[i].classList.contains(previousSVGClass)) {
				console.log(totalAnimationDuration);
				animator.animateVectorFill(`.${previousSVGClass}`, totalAnimationDuration, isHeading)

				if (previousSVGClass === "heading-svg")
					animator.initialiseHeadingAnimation(svgs[i], isVisible, totalAnimationDuration);

				previousSVGClass = svgs[i].classList[1];

				if (i === svgs.length - 1)
					animator.animateVectorFill(`.${previousSVGClass}`, totalAnimationDuration, isHeading);
			}
		}
	},

	initialiseHeadingAnimation: (isVisible, delay) => {
		if(isVisible) { //checks whether the heading is out of sight or not...
			//... if it isn't, animate all the heading elements...
			
			//animator.animateVectorStroke(svg, delay);//, 0.2, 2, 0.5);
			$('#heading-text').css({
				'animation': `text-reveal-animation 1s ease forwards ${delay}s`
			});
			$('#heading-icon').css({
				'animation': `vector-reveal-animation 1s ease forwards ${delay}s`
			});
		}
		else { //... if it is out of sight, I don't want the animation to waste resources and I also don't want it to happen when it's scrolled to by the user, so just prevent it
			//we therefore need to skip the animations of the other 2 heading elements as well and make them visible
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

	animateVectorStroke: (svg, delay) => {
		const vectors = svg.children;
		const isHeading = svg.className === "heading-svg";

		for (let i = 0; i < vectors.length; i++)
			$(`#${vectors[i].id}`).css({
				'animation': `vector-stroke-animation ${isHeading ? animator.heading_svg_dpl : animator.duration_per_letter}s ease forwards ${delay + (isHeading ? animator.heading_svg_dbl : animator.delay_between_letters) * i}s`
			});
	},

	animateVectorFill: (identifier, delay, isHeading) => {
		$(`${identifier}`).css({
			'animation': `vector-fill-animation ${isHeading ? animator.heading_svg_fid : animator.fade_in_duration}s ease forwards ${delay}`
		});
	},

	initialiseCardsAnimations: () => {
		const cards = document.getElementsByClassName("card-container");
	
		for (let i = 0; i < cards.length; i++) {
			const svg = cards[i].parentElement.getElementsByClassName("text-as-svg")[0];

			if (animator.isOnScreen(svg)) //if the element is already on screen, this prevents the animation waiting for the user to scroll to it...
				$(`#${cards[i].id}`).css({
					'animation': `cards-reveal-animation ${animator.fade_in_duration}s ease forwards ${animator.getVectorAnimationDuration(svg)}s`
				});
			else //... otherwise, append it to the list of animations pending a positive visibility (on screen) check
				animationsCollection.animations.push({method: animator.cardsOnScrollEvent, args: [cards, svg]}); //adds this animate function to the list of pending animations, with its respective arguments
		}
	},

	cardsOnScrollEvent: (cards, svg) => {
		if (animator.isOnScreen(svg)) {
			for (let i = 0; i < cards.length; i++)
				$(`#${cards[i].id}`).css({
					'animation': `cards-reveal-animation ${animator.fade_in_duration}s ease forwards ${animator.getVectorAnimationDuration(svg)}s`
				});

			return true;
		}
		//return false; //shouldn't be needed as, at this point, the value returned will be 'undefined' which is the equivalent of 'false'
	},
	
	vectorOnScrollEvent: (svg) => {
		if (animator.isOnScreen(svg)){
			animator.animateVectorStroke(svg);
			return true;
		}
		//return false; //shouldn't be needed as, at this point, the value returned will be 'undefined' which is the equivalent of 'false'
	},
	
	isOnScreen: (elm) => { //used to determine if an element is on screen (credit - https://stackoverflow.com/a/5354536/11136104)
		var rect = elm.getBoundingClientRect();
		var viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
		return !(rect.bottom < 0 || rect.top - viewHeight >= 0);
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
