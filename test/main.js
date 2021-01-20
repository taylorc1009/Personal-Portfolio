//you may have noticed the 'example.json' file is inactive: to read it, we need a web server (https://stackoverflow.com/a/19706080/11136104)

/*function httpGetAsync(theUrl, callback) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous
    xmlHttp.send(null);
}*/

function getDateTime() {
	var dateTime = Date();
	document.getElementById('datetime').innerHTML = '<p>' + dateTime + ' (with JavaScript onMouseOver and onMouseOut example).</p>';
}

function changeColour(obj, color) {
	obj.style.color = color;
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
