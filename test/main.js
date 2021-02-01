/*function httpGetAsync(theUrl, callback) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous
    xmlHttp.send(null);
}*/

/*oldSizes = {};

function fixSmallText() {
	var elems = document.body.getElementsByTagName("*");
	for(var elem of elems) {
		var style = window.getComputedStyle(elem, null).getPropertyValue('font-size');
		var fontSize = parseFloat(style);
		if(fontSize < 12) {
			if(!(elem in oldSizes))
				oldSizes[elem] = style;
			elem.style.fontSize = '12px';
		}
		else if(elem in oldSizes)
				elem.style.fontSize = oldSizes[elem];
	};

	/* $("*").each(function () {
    var $this = $(this);
    if (parseInt($this.css("fontSize")) < 12) {
        $this.css({ "font-size": "12px" });
    }
	}); *
}*/

animator = {
	body_dq: 0.1, //delay between the beginning of 1 letter stroke animation and the next letters' beginning
	body_dpl: 1.5, //duration it takes to animate 1 full letters' stroke
	body_fid: 0.25, //duration of the SVG fill fade in effect

	initialiseAnimations: () => {
		animator.initialiseVectors();
		animator.initialiseCards();
	},

	getVectorStrokeDuration: (delay, delay_quantifier, duration_per_letter) => {
		return delay + (duration_per_letter - delay_quantifier);
	},

	initialiseCards: () => {
		const cards = document.getElementsByClassName("card-container");
	
		for (let i = 0; i < cards.length; i++) {
			//these are used to calculate the delay, if any, of which to reveal the cards, based on the SVG animation duration
			var local_svg = cards[i].parentElement.getElementsByClassName("text-as-svg"); //gets any SVG in the same block as the cards
			var delay = local_svg ? animator.body_dq * document.querySelectorAll(`#${local_svg[0].id} path`).length : 0; //calculates the delay, based on the amount of vector paths (if an SVG exists)
	
			//if there is no delay, i.e. no neighbouring element that is of class 'text-as-svg', then there must be no delay in the card-reveal animation
			var local_body_dq = 0, local_body_dpl = 0;
			if (delay > 0) { //'delay' will be defined if there is a neighbouring SVG; if there isn't then the parameters have been initialised as 0 anyway (to skip the delay)
				local_body_dq = animator.body_dq;
				local_body_dpl = animator.body_dpl;
			}
	
			if (animator.isOnScreen(cards[i])) { //if the element is already on screen, this prevents the animation waiting for the user to scroll to it...
				$(`#${cards[i].id}`).css({
					'animation': `cards-reveal-animation ${animator.body_fid}s ease forwards ${animator.getVectorStrokeDuration(delay, local_body_dq, local_body_dpl)}s`
				});
			}
			else { //... otherwise, append it to the list of animations pending a positive visibility (on screen) check
				scrollAnimations.animations.push({method: animator.cardsOnScrollEvent, args: [cards[i], delay, local_body_dq, local_body_dpl]}); //adds this animate function to the list of pending animations, with its respective arguments
			}
		}
	},

	initialiseVectors: () => {
		const svgs = document.getElementsByClassName("text-as-svg");
	
		for (let i = 0; i < svgs.length; i++) {
			const vectors = document.querySelectorAll(`#${svgs[i].id} path`);
	
			//these are used to determine whether or not to skip the intro animation: if the elements are off-screen
			var isHeading = svgs[i].id === "heading-svg";
			var isVisible = animator.isOnScreen(svgs[i]);
			var preventIntro = isHeading && !isVisible;
	
			for (let j = 0; j < vectors.length; j++) {
				var pathLength = vectors[j].getTotalLength(); //gets the full outer path length of the SVG
	
				$(`#${vectors[j].id}`).css({
					'stroke-dasharray': pathLength, //applies the dash effect to the outer path of the SVG, continuing the whole way round, to form the entire letter
					'stroke-dashoffset': preventIntro ? 0 : pathLength, //offsets the dash effect to essentially hide the stoke by creating a gap between the dash (or, would be, dashes) that is as long as the entire path
				});
			}
			$(`#${svgs[i].id}`).css({
				'fill': preventIntro ? 'rgba(var(--color-pure-white))' : 'rgba(var(--color-transparent))'
			})
	
			if (isHeading) { //the heading is animated differently; the duration is longer to give it a nicer effect
				if(isVisible) { //checks whether the heading is out of sight or not...
					//... if it isn't, animate all the heading elements...
					animator.animateVectorStroke(svgs[i].id, 0.2, 2, 0.5);
					$('#heading-text').css({
						'animation': 'text-reveal-animation 1s ease forwards 4.4s'
					});
					$('#heading-icon').css({
						'animation': 'vector-reveal-animation 0.5s ease forwards 4.4s'
					});
				}
				else { //... if it is out of sight, I don't want the animation to waste resources and I also don't want it to happen when it's scrolled to by the user, so just prevent it
					//we therefore need to skip the animations of the other 2 heading elements as well and make them visible
					$('#heading-text').css({
						'color': 'rgba(var(--color-pure-white))',
						'top': '35%'
					});
					$('#heading-icon').css({
						'fill-opacity': 1
					});
				}
			}
			else { //we use a different animation for text vectors in the body as we don't want the user to have to wait long for it to finish before they can do things
				if (isVisible) { //if the element is already on screen, this prevents the animation waiting for the user to scroll to it...
					animator.animateVectorStroke(svgs[i].id, animator.body_dq, animator.body_dpl, animator.body_fid);
				}
				else { //... otherwise, append it to the list of animations pending a positive visibility (on screen) check
					scrollAnimations.animations.push({method: animator.vectorOnScrollEvent, args: [svgs[i]]}); //adds this animate function to the list of pending animations, with its respective arguments
				}
			}
		}
	},

	animateVectorStroke: (svg_element, delay_quantifier, duration_per_letter, fade_in_duration) => {
		const element_id = `#${svg_element}`;
		const vectors = document.querySelectorAll(`${element_id} path`);
		var i, delay;
	
		for (i = 0; i < vectors.length; i++) {
			var pathLength = vectors[i].getTotalLength(); //gets the full outer path length of the SVG
			delay = delay_quantifier * i;
	
			$(`#${vectors[i].id}`).css({
				//'stroke-dasharray': pathLength, //applies the dash effect to the outer path of the SVG, continuing the whole way round, to form the entire letter
				//'stroke-dashoffset': pathLength, //offsets the dash effect to essentially hide the stoke by creating a gap between the dash (or, would be, dashes) that is as long as the entire path
				'animation': `vector-stroke-animation ${duration_per_letter}s ease forwards ${delay}s` //thisanimation 'ease's the offset of the dash from the entire path length back to 0, slowly revealing the stroke
			});
		}
	
		$(element_id).css({
			'animation': `vector-fill-animation ${fade_in_duration}s ease forwards ${animator.getVectorStrokeDuration(delay, delay_quantifier, duration_per_letter)}s`
		});
	},

	cardsOnScrollEvent: (card, delay, local_body_dq, local_body_dpl) => {
		if (animator.isOnScreen(card)) {
			$(`#${card.id}`).css({
				'animation': `cards-reveal-animation ${animator.body_fid}s ease forwards ${animator.getVectorStrokeDuration(delay, local_body_dq, local_body_dpl)}s`
			});
			return true;
		}
		//return false; //shouldn't be needed as, at this point, the value returned will be 'undefined' which is the equivelant of 'false'
	},
	
	vectorOnScrollEvent: (svg) => {
		if (animator.isOnScreen(svg)){
			animator.animateVectorStroke(svg.id, animator.body_dq, animator.body_dpl, animator.body_fid);
			return true;
		}
		//return false; //shouldn't be needed as, at this point, the value returned will be 'undefined' which is the equivelant of 'false'
	},
	
	isOnScreen: (elm) => { //used to determine if an element is on screen (credit - https://stackoverflow.com/a/5354536/11136104)
		var rect = elm.getBoundingClientRect();
		var viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
		return !(rect.bottom < 0 || rect.top - viewHeight >= 0);
	}
}

scrollAnimations = { //contains a list of methods that begin animations when specific elements are scrolled down to
	animations: [], //this is a list of methods which invoke pending animations

	deleteAnimation: (i) => { //we don't want the animation to run every time it's scrolled to so once it has ran, delete it
		const index = scrollAnimations.animations[i];
		if (index !== -1) {
			scrollAnimations.animations.splice(index, 1);
		}
	}
};

window.onscroll = () => { //I tried to use the "scroll" event listener instead of this, but the listener would be deleted after the users' first scroll, rendering it useless for this purpose
	for (let i = 0; i < scrollAnimations.animations.length; i++) {
		if (scrollAnimations.animations[i].method.apply(this, scrollAnimations.animations[i].args)) { //'.apply()' unpacks the list of arguments required for this animation
			scrollAnimations.deleteAnimation(i); //if this animation has begun (the animations' method returned 'true') then it is time to stop the animation from pending
		}
	}
}







/*function storageTest() {
	if(window.confirm('Would you like to test the storage examples?')) { //confirmation prompt example
		var value = window.prompt('What is your name?');

		if(value != null) {
			var name = "username", storage = window.sessionStorage;

			//Cookie example
			//setCookie(name, value, 2);
			//console.log(getCookie(name));

			//Storage example
			storeValue(name, value, storage);
			console.log("storeValue stored the value: " + storage.getItem(name));
			console.log("storage removeValue successful = " + removeValue(name, storage));
		}
	}
}

function setCookie(name, value, expiry) { //this isn't working: document.cookie is always empty
	var d = new Date();

	d.setTime(d.getTime() + (expiry*24*60*60*1000));
	var expires = "expires="+ d.toUTCString();

	//HttpOnly cookies cannot be accessed from Javascript and session cookies are usually set as HttpOnly cookies - https://stackoverflow.com/a/18251941

	document.cookie = name + "=" + value + ", " + expires + ", domain=" + window.location.hostname + ", path=/, secure";
}

function getCookie(cookieName)
{
	var name = cookieName + "=";
	var decodedCookie = decodeURIComponent(document.cookie);
	var ca = decodedCookie.split(',');
	for(var i = 0; i < ca.length; i++) {
		var c = ca [i];
		while(c.charAt(0) == ' ') {
			c = c.substring(1);
		}
		if(c.indexOf(name) == 0)
			return c.substring(name.length, c.length);
	}
	return "";
}

function storeValue(name, value, storage) {
	try { //tries to store the data in storage (type may be either: session (temporary) or local (permanent))
		//if(storageAvailable(storage === window.sessionStorage ? 'sessionStorage' : 'localStorage')) {
			storage.setItem(name, value);
			return true;
		//}
		//else
		//	throw IllegalStateException;
	}
	catch (e) { //checks if storage didn't fail because it is full (returns true if it did)
		return e instanceof DOMException && (
			   e.code === 22 ||
			   e.code === 1014 ||
			   e.name === 'QuotaExceededError' ||
			   e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
			   storage.length !== 0;
	}
}

function removeValue(name, storage) {
	try {
		if(storage.getItem(name) !== null) {
			storage.removeItem(name);
			return true;
		}
		throw IllegalStateException;
	}
	catch(e) {
		return false;
	}
}*/