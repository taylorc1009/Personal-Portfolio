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

function animateVectorStroke(svg_element, delay_quantifier, duration_per_letter, fade_in_duration) {
	element_id = `#${svg_element}`;
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
		'animation': `vector-fill-animation ${fade_in_duration}s ease forwards ${delay + (duration_per_letter - delay / i)}s`
	});
}

function initialiseVectors() {
	const svgs = document.getElementsByClassName("text-as-svg");
	var isHeading, isVisible;

	for (let i = 0; i < svgs.length; i++) {
		const vectors = document.querySelectorAll(`#${svgs[i].id} path`);
		isHeading = (svgs[i].id === "heading-svg");
		isVisible = isOnScreen(svgs[i]);
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

		if (isHeading) { //animates the heading differently and whether it's out of sight or not (as the other 2 heading elements will not wait for this anyway)
			if(isVisible) {
				animateVectorStroke(svgs[i].id, 0.2, 2, 0.5);
				$('#heading-text').css({
					'animation': 'text-reveal-animation 1s ease forwards 4.4s'
				});
				$('#heading-icon').css({
					'animation': 'vector-reveal-animation 0.5s ease forwards 4.4s'
				});
			}
			else {
				$('#heading-text').css({
					'color': 'rgba(var(--color-pure-white))',
					'top': '21%'
				});
				$('#heading-icon').css({
					'fill-opacity': 1
				});
			}
		}
		else {
			if (isVisible) { //this prevents the animation waiting for the user to scroll, dispite already being visible
				animateVectorStroke(svgs[i].id, 0.1, 1.5, 0.25);
			}
			else {
				window.onscroll = function() { //when the user has scrolled far enough to see this vector, initiate the animation
					if (isOnScreen(svgs[i])){
				  		animateVectorStroke(svgs[i].id, 0.1, 1.5, 0.25);
					}
				};
			}
		}
	}
}

function isOnScreen(elm) {
  var rect = elm.getBoundingClientRect();
  var viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
  return !(rect.bottom < 0 || rect.top - viewHeight >= 0);
}





function storageTest() {
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
}
