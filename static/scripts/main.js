window.onscroll = () => { //I tried to use the "scroll" event listener instead of this, but the listener would be deleted after the user's first scroll, rendering it useless for this purpose
	for(const [key, value] of Object.entries(pendingAnimations.queue))
		if (value.method.apply(this, value.args)) //executes the "animator.onScrollHandler" - '.apply()' unpacks the list of arguments required for this animation
			pendingAnimations.deleteAnimation(key); //if this animation has begun (the animations' method returned 'true') then it is time to stop the animation from pending
}

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

				if (isVisible) //if the SVG is already on screen, run the animation; preventing the animation waiting for the user to scroll to it...
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
					totalAnimationDuration]
			};
		else { //... otherwise, we need to list the duration of the animation for the current word in the text SVG group, so we can stagger the start of the animation for the next word (thanks to the "else if" above, this won't happen for SVG groups with only one word)
			pendingAnimations.queue[SVGClass].args[2].push(delay);
			/* //! this "if" is for when using the multi-line animation trigger in initialiseVectorAnimations
			if(totalAnimationDuration > pendingAnimations.queue[SVGClass].args[3])*/
			pendingAnimations.queue[SVGClass].args[3] = totalAnimationDuration;
		}
	},

	getSVGsSiblingsToFadeIn: (SVGContainer) => { //returns the list of elements that are in the same container as a text SVG's container (so they can fade in at the same time as the SVG fill animation)
		let SVGSiblingsAnimations = [];

		for (const sibling of SVGContainer.parentElement.children)
			if (sibling != SVGContainer)
				SVGSiblingsAnimations.push({method: animations.fadeInSiblings, args: [sibling]});

		return SVGSiblingsAnimations;
	},

	postVectorStrokeAnimEvents: (SVGs, SVGClass, totalAnimationDuration) => {
		animations.animateVectorFill(SVGClass, totalAnimationDuration);

		for (const animation of animator.getSVGsSiblingsToFadeIn(SVGs[0].parentElement)) {
			animation.args.push(totalAnimationDuration);
			animation.method.apply(this, animation.args);
		}

		switch (SVGClass) { //unique post-stroke-animation animations (e.g. sub-heading after the heading stroke animation)
			case "heading-svg":
				animations.initialiseSubheadingAnimation(true, totalAnimationDuration);
				break;
			case "projects-svg":
				animations.animateIDE(totalAnimationDuration);
				animations.animateCVRPTW(totalAnimationDuration);
				animations.animateNQueens(totalAnimationDuration);
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
			'fill': `${preventIntro ? 'white' : 'transparent'}`
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
		await miscellaneous.sleep(SVGAnimationDuration);

		const ideCode = document.getElementById("ide-code"),
			  ideLineNumbers = document.getElementById("ide-line-numbers"),
			  ideEditor = document.getElementById("ide-editor");

		let textElem,
			lines = 1, //add the first line number - the loop will start on this line and only ever add new line numbers when there's a new line in stringsAndHighlights
			lineNumElem = miscellaneous.createElement({type: "li", innerText: "1", parent: ideLineNumbers}),
			lineContainer = miscellaneous.createElement({type: "div", className: "ide-line-container", parent: ideCode})
			adjustHorizontalScroll = false; //this is declared in a higher scope because we may need to move the horizontal scroll position to 0 when the text takes a new line

		for (const [i, [className, string]] of data.ideStringsAndHighlights.entries()) {
			$(lineNumElem).css({ //set the number of the line that's currently being animated to white, simulating this line to be the active line (similar to how actual IDEs make the number of the line - that the user is currently working on - white)
				'color': 'white'
			});

			if (className && string !== "\n") { //list entries "[null, "\n"]" indicate that the ide should take a new line; this block of code runs when one of these entries was not found
				textElem = miscellaneous.createElement({type: "span", className: "ide-code-" + className, parent: lineContainer});

				$(textElem).css({ //gives the effect of having a text cursor
					'border-right': '2px solid white'
				});

				adjustHorizontalScroll = await animations.ideProgressiveStringInjection(lineContainer, textElem, string);

				if (i < data.ideStringsAndHighlights.length) //don't remove the cursor effect from the last element as this is given an idle cursor animation once all strings have been outputted
					$(textElem).css({ //removes the text cursor effect from "element" after the HTML element has been fully populated by the "string" variable, ready for the next element to have the cursor
						'border-right': 'none'
					});
			}
			else { //take a new line when "[null, "\n"]" is encounter in the list of strings
				let adjustVerticalScroll = mathematics.notOverflownVertically(lineContainer, ideEditor); //we need to calculate whether the user is already at the bottom of the scrollable box before we add new elements to it, then scroll to the bottom afterwards

				lineContainer = miscellaneous.createElement({type: "div", className: "ide-line-container", parent: ideCode});

				$(lineNumElem).css({ //since the animation is moving to a new line, the number of the current line should change from white to grey as it's no longer the currently active line (similar to an actual IDE)
					'color': 'grey'
				});
				lineNumElem = miscellaneous.createElement({type: "li", innerText: (++lines).toString(), parent: ideLineNumbers});

				animations.ideAdjustVerticalAndHorizontalScroll(adjustVerticalScroll, adjustHorizontalScroll);
			}
		}

		$(textElem).css({ //applies the idle text cursor animation
			'animation': 'ide-text-cursor-animation 2s infinite'
		});
	},

	ideProgressiveStringInjection: async (lineContainer, textElem, string) => {
		//acquire these elements in this procedure to avoid asking for them as parameters
		const ideCode = document.getElementById("ide-code"),
			  ideEditor = document.getElementById("ide-editor");

		let adjustHorizontalScroll = false;

		for (const char of string) {
			adjustHorizontalScroll = mathematics.notOverflownHorizontally(lineContainer, ideCode); //detect whether the right-edge of "lineContainer" has overflown horizontally
			
			textElem.textContent += char === "\t" ? "\u00a0\u00a0\u00a0\u00a0" : char; //"\t" indicates a tab, but I can't find a way of adding a tab that works and is friendly to this animation

			if (adjustHorizontalScroll //if the text element had not overflown the eight-end of the container, before "char" was added to the text element...
				&& mathematics.hasOverflownHorizontally(lineContainer, ideCode) //... and, after "char" was added, the text element has now overflown the right-side of the container...
				&& mathematics.notOverflownVertically(lineContainer, ideEditor) //... and the text element has also not overflown the container vertically...
			)
				ideCode.scrollLeft = (lineContainer.offsetWidth - ideCode.offsetWidth) + 7; //... adjust horizontal scrolling so the edge of the text/line meets the right-end of the container (+7 to accommodate for the 2px-wide text cursor and the 5px-wide margin)

			await miscellaneous.sleep(mathematics.ide_code_dbl);
		}

		return adjustHorizontalScroll;
	},

	ideAdjustVerticalAndHorizontalScroll: (adjustVerticalScroll, adjustHorizontalScroll) => {
		//acquire these elements in this procedure to avoid asking for them as parameters
		const ideCode = document.getElementById("ide-code"),
			  ideEditor = document.getElementById("ide-editor");

		if (adjustVerticalScroll)
			ideEditor.scrollTop = ideEditor.scrollHeight; //move the vertical scroll position down as whenever a new line is added, we will only ever want to move the scroll position down; not up
		if (adjustHorizontalScroll)
			ideCode.scrollLeft = 0;  //when the horizontal scroll position has been adjusted by this JavaScript, we need to reset it to 0 when the animation takes a "new line of code" (i.e. \n)
	},

	animateCVRPTW: async (totalAnimationDuration) => {
		await miscellaneous.sleep(totalAnimationDuration);

		const cvrptwImageElem = document.getElementById("cvrptw-image-cycler")
			  n = data.cvrptwInlineSVGs.length;
			  imageIterator = Object.entries(data.cvrptwInlineSVGs);

		for(;;) {
			for (const [i, SVG] of imageIterator) {
				$(cvrptwImageElem).css({
					'content': `url(\"${SVG}\")`,
				});

				await miscellaneous.sleep(i < n - 1 ? (i + 1) * .005 : 5);
			}
		}
	},

	animateNQueens: async (totalAnimationDuration) => {
		await miscellaneous.sleep(totalAnimationDuration);

		const boardElem = document.getElementById("n-queens-board"),
			  n = Math.sqrt(boardElem.children.length); //board size will always be NxN

		let queensPositions = Array(n).fill(0);

		miscellaneous.removeChildrenNotOfType(boardElem, "span"); //the boardElem.childNodes list also contains any '\n' characters that are in the code, simply for readability; remove these

		for (;;) {
			const board = animations.generateNQueens(n);

			board.forEach((column, i) => {
				const row = n * i;

				animations.moveQueen(boardElem, row + queensPositions[i], row + column);

				queensPositions[i] = column;
			});

			await animations.fadeQueensInAndOut(board);
		}
	},

	moveQueen: (boardElem, origin, destination) => {
		boardElem.childNodes[destination].appendChild(boardElem.childNodes[origin].childNodes[0]);
		boardElem.childNodes[origin].appendChild(boardElem.childNodes[destination].childNodes[0]);
	},

	generateNQueens: (n) => {
		return Array.from({length: n}, () => mathematics.randomInt(n));
	},

	fadeQueensInAndOut: async (board) => {
		animations.fadeQueensOpacity(board, 1);

		await miscellaneous.sleep(2.5);

		const boardElem = document.getElementById("n-queens-board"),
			  errors = mathematics.nQueensIsValid(board),
			  rowsWithInvalidQueens = new Set();
		let cellsToRecolour = {
				"odd": new Set(),
				"even": new Set()
			};

		for (const rowsWithErrors of errors) {
			rowsWithErrors.forEach(rowsWithInvalidQueens.add, rowsWithInvalidQueens);

			for (const cellIndex of mathematics.getCellsBetweenQueens(board, rowsWithErrors)) {
				const cell = boardElem.children[cellIndex],
					  numType = cellIndex % 2 ? "even" : "odd"; //this is inverted because the colours are named in CSS with respect to CSS's indexing starting at 1; since JS starts at 0, if we try to set the first "#n-queens-board" child to odds' colour (which we would do in CSS, due to it being at index 1) then we would be setting an even node to odds' colour as the first child is at 0 in JS

				if (!cellsToRecolour[numType].has(cellIndex))
					animations.fadeBoardCellColour(cell, data.chessBoardColours[numType + "-error"]);

				cellsToRecolour[numType].add(cellIndex); //because the values of the object are Sets, there will be no duplicates because ".add()" won't insert a number if it already exists
			}
		}

		if (rowsWithInvalidQueens.size < board.length) {
			rowsWithValidQueens = [...Array(board.length).keys()].filter((row) => { return !rowsWithInvalidQueens.has(row) });

			for (const row of rowsWithValidQueens) {
				const cellIndex = board.length * row + board[row],
					  numType = cellIndex % 2 ? "even" : "odd";

				animations.fadeBoardCellColour(boardElem.children[cellIndex], data.chessBoardColours[numType + "-valid"]);

				cellsToRecolour[numType].add(cellIndex)
			}
		}

		await miscellaneous.sleep(5);

		animations.fadeQueensOpacity(board, 0);

		for (const [numType, cellIndexes] of Object.entries(cellsToRecolour))
			for (const cellIndex of cellIndexes)
				animations.fadeBoardCellColour(boardElem.children[cellIndex], data.chessBoardColours[numType]);

		await miscellaneous.sleep(1);
	},

	fadeQueensOpacity: (board, opacity) => {
		const boardElem = document.getElementById("n-queens-board"),
			  n = board.length;

		for (const [i, column] of board.entries())
			$(boardElem.childNodes[n * i + column].childNodes[0]).animate({
				'opacity': `${opacity}`
			}, {
				duration: 1000
			});
	},

	fadeBoardCellColour: (cell, colour) => {
		$(cell).animate({
			'background-color': colour
		}, {
			duration: 1000
		});
	}
}

pendingAnimations = { //contains a list of methods that begin animations when specific elements are scrolled down to
	queue: {}, //this is a list of methods which invoke pending animations

	deleteAnimation: (SVGClass) => {
		if (pendingAnimations.queue.hasOwnProperty(SVGClass))
			delete pendingAnimations.queue[SVGClass];
	}
};

mathematics = {
	//there's different animation durations for text vectors in the page body as we don't want the user to have to wait long for them to finish every time
	//the heading animation lasts longer and, as you can see, it's parameters begin with "heading_svg_"
	delay_between_letters: .1, //delay (s) between the beginning of 1 letter stroke animation and the next letters' beginning
	duration_per_letter: 1.5, //duration (s) of one full letters' stroke animation
	fade_in_duration: .25, //duration (s) of the SVG fill's fade in effect
	heading_svg_dbl: .2,
	heading_svg_dpl: 2,
	heading_svg_fid: .5,
	ide_code_dbl: .06, //delay (ms) between adding the next letter to the IDE code

	randomInt: (n) => {
		return Math.floor(Math.random() * n);
	},

	isOnScreen: (element) => { //used to determine if an element is on screen (credit - https://stackoverflow.com/a/5354536/11136104)
		const rect = element.getBoundingClientRect();
		return !(rect.bottom < 0 || rect.top - Math.max(document.documentElement.clientHeight, window.innerHeight) >= 0);
	},

	notOverflownVertically: (element, container) => {
		return element.offsetTop - container.scrollTop <= container.offsetHeight; //returns true if the top of the element has not overflown below the container (the "minus scrollTop" exists to detect if the element has not overflown, thanks to the user scrolling down)
	},

	hasOverflownHorizontally: (element, container) => {
		return element.offsetWidth >= container.offsetWidth + container.scrollLeft; //returns true if the element is wider than: the container plus how far the user has scrolled along the container
	},

	notOverflownHorizontally: (element, container) => {
		return element.offsetWidth - container.scrollLeft <= container.offsetWidth;
	},

	nQueensIsValid: (board) => {
		let errors = [];

		for (let rowItOne = 0; rowItOne < board.length; rowItOne++) {
			const columnOne = board[rowItOne];

			for (let rowItTwo = rowItOne + 1; rowItTwo < board.length; rowItTwo++) {
				const columnTwo = board[rowItTwo];

				if (columnTwo == columnOne ||
					columnTwo == columnOne - (rowItOne - rowItTwo) ||
					columnTwo == columnOne + (rowItOne - rowItTwo)
				)
					errors.push([rowItOne, rowItTwo]);
			}
		}

		return errors;
	},

	getCellsBetweenQueens: (board, rowsWithErrors) => {
		const [rowOne, rowTwo] = rowsWithErrors,
			  [minRow, maxRow] = rowOne < rowTwo ? [rowOne, rowTwo] : [rowTwo, rowOne],
			  n = board.length;

		let connectingCells = [];
			
		if (board[minRow] < board[maxRow]) //queens conflict with an incline diagonal
			for (let i = minRow; i <= maxRow; i++)
				connectingCells.push(n * i + (board[minRow] + (i - minRow)));
		else if (board[minRow] > board[maxRow]) //queens conflict with an decline diagonal
			for (let i = minRow; i <= maxRow; i++)
				connectingCells.push(n * i + (board[minRow] - (i - minRow)));
		else //queens conflict by column
			for (let i = minRow; i <= maxRow; i++)
				connectingCells.push(n * i + board[minRow]);

		return connectingCells;
	}

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
	},

	sleep: (ms) => {
		return new Promise(resolve => setTimeout(resolve, ms * 1000));
	},

	removeChildrenNotOfType: (parent, type) => {
		for (const child of parent.childNodes)
			if (child.nodeName.toLowerCase() !== type)
				parent.removeChild(child);
	},

	rgbToHex: (rgbString) => {
		return `#${rgbString.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/).slice(1).map(n => parseInt(n, 10).toString(16).padStart(2, '0')).join('')}`;
	}
}

data = {
	ideStringsAndHighlights: [ //Nx2 matrix structure: first value is the CSS class which entails the syntax highlighting of the string, second is the string/code (null/"\n" indicates a new line)
		["keyword", "#include "], ["string", "<iostream>"], [null, "\n"],
		["keyword", "#include "], ["string", "<string>"], [null, "\n"],
		[null, "\n"],
		["keyword", "bool "], ["function", "isNumber("], ["keyword", "const char"], ["operator", "* "], ["parameter", "s"], ["function", ")"], ["standard", ";"], [null, "\n"],
		["keyword", "void "], ["function", "fizzBuzz("], ["keyword", "const int "], ["parameter", "n"], ["function", ")"], ["standard", ";"], [null, "\n"],
		[null, "\n"],
		["keyword", "int "], ["function", "main("], ["keyword", "int "], ["parameter", "argc"], ["standard", ", "], ["keyword", "char"], ["operator", "** "], ["parameter", "argv"], ["function", ") {"], [null, "\n"],
		["keyword", "\tif "], ["function", "("], ["parameter", "argc "], ["operator", "!= "], ["variable", "2 "], ["operator", "|| !"], ["function", "isNumber("], ["parameter", "argv"], ["operator", "["], ["variable", "1"], ["operator", "]"], ["function", ")) {"], [null, "\n"],
		["standard", "\t\tstd::"], ["variable", "cout "], ["operator", "<< "], ["string", "\"error: Can only accept one, numeric argument.\""], ["standard", ";"], [null, "\n"],
		["keyword", "\t\treturn "], ["variable", "1"], ["standard", ";"], [null, "\n"],
		["function", "\t}"], [null, "\n"],
		[null, "\n"],
		["function", "\tfizzBuzz(atoi("], ["variable", "argv"], ["operator", "["], ["variable", "1"], ["operator", "]"], ["function", "))"], ["standard", ";"], [null, "\n"],
		["keyword", "\treturn "], ["variable", "0"], ["standard", ";"], [null, "\n"],
		["function", "}"], [null, "\n"],
		[null, "\n"],
		["keyword", "bool "], ["function", "isNumber("], ["keyword", "const char"], ["operator", "* "], ["parameter", "s"], ["function", ") {"], [null, "\n"],
		["keyword", "\tfor "], ["function", "("], ["keyword", "int "], ["variable", "i "], ["operator", "= "], ["variable", "0"], ["standard", "; "], ["parameter", "s"], ["operator", "["], ["variable", "i"], ["operator", "] != "], ["string", "'\\0'"], ["standard", "; "], ["variable", "i"], ["operator", "++"], ["function", ")"], [null, "\n"],
		["keyword", "\t\tif "], ["function", "("], ["operator", "!"], ["function", "isdigit("], ["parameter", "s"], ["operator", "["], ["variable", "i"], ["operator", "]"], ["function", "))"], [null, "\n"],
		["keyword", "\t\t\treturn "], ["variable", "false"], ["standard", ";"], [null, "\n"],
		["keyword", "\treturn "], ["variable", "true"], ["standard", ";"], [null, "\n"],
		["function", "}"], [null, "\n"],
		[null, "\n"],
		["keyword", "void "], ["function", "fizzBuzz("], ["keyword", "const int "], ["parameter", "n"], ["function", ") {"], [null, "\n"],
		["keyword", "\tfor "], ["function", "("], ["keyword", "int "], ["variable", "i "], ["operator", "= "], ["variable", "1"], ["standard", "; "], ["variable", "i "], ["operator", "<= "], ["parameter", "n"], ["standard", "; "], ["variable", "i"], ["operator", "++"], ["function", ") {"], [null, "\n"],
		["standard", "\t\tstd::"], ["keyword", "string "], ["variable", "out "], ["operator", "= "], ["string", "\"\""], ["standard", ";"], [null, "\n"],
		[null, "\n"],
		["keyword", "\t\tif "], ["function", "("], ["operator", "!"], ["function", "("], ["variable", "i "], ["operator", "% "], ["variable ", "3"], ["function", "))"], [null, "\n"],
		["variable", "\t\t\tout "], ["operator", "+= "], ["string", "\"Fizz\""], ["standard", ";"], [null, "\n"],
		["keyword", "\t\tif "], ["function", "("], ["operator", "!"], ["function", "("], ["variable", "i "], ["operator", "% "], ["variable ", "5"], ["function", "))"], [null, "\n"],
		["variable", "\t\t\tout "], ["operator", "+= "], ["string", "\"Buzz\""], ["standard", ";"], [null, "\n"],
		[null, "\n"],
		["standard", "\t\tstd::"], ["variable", "cout "], ["operator", "<< "], ["function", "("], ["operator", "!"], ["variable", "out"], ["operator", "."], ["function", "empty() "], ["operator", "? "], ["variable", "out "], ["operator", ": "], ["standard", "std::"], ["function", "to_string("], ["variable", "i"], ["function", ")) "], ["operator", "<< "], ["standard", "std::"], ["variable", "endl"], ["standard", ";"], [null, "\n"],
		["function", "\t}"], [null, "\n"],
		["function", "}"]
	],

	cvrptwInlineSVGs: [
		"data:image/svg+xml,%3Csvg width='1651' height='990' fill='none' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Cg clip-path='url(%23clip0_622_27)'%3E%3Cmask id='mask0_622_27' style='mask-type:luminance' maskUnits='userSpaceOnUse' x='0' y='0' width='1651' height='990'%3E%3Cpath d='M1650.5 0H0.5V990H1650.5V0Z' fill='white'/%3E%3C/mask%3E%3Cg mask='url(%23mask0_622_27)'%3E%3Cpath d='M702.1 440.04L735.1 275L586 638L1279 385.04L702.1 440.04Z' stroke='%238360C3' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440H454.09V418.04H421.09L372 440V385.04L784 220L702.1 440Z' stroke='%23ED7D31' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440.04L619.1 660H570.1L421 385.04H454.09H504.09L784 242L504.09 605.05L702.1 440.04Z' stroke='%23D5D5D5' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440.04L999.11 165.032L1032.11 110.03H1065.11L1114 88L916.11 660H537H834.1H784.1L702.1 440.04Z' stroke='%23FFC000' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 440.04V825.05H735.1V880.06L768.1 935L1197 352.04L1164.11 330H1114.11L1081.11 352.04L702 440.04Z' stroke='%235B9BD5' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440L817.1 550.04L619.1 638.05L916 605.05L537.09 638.05L867.1 660H504.09H454L471.09 638.05L454 605.05L702.1 440Z' stroke='%23F2727F' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440L405.09 165.032H339.09H289V110.03H372.09V55H405.09H454.09L1032 330.04L702.1 440Z' stroke='%23C31432' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 440L207.08 550.04H174.08L207.08 605H124.08L75.0801 550.04H42V495.04H124.08H174.08L702 440Z' stroke='%23FF4B2B' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 440L1444.12 605.05H1494.13H1527.13H1609V660.05H1560.13H1494.13H1477.12L1444.12 715L702 440Z' stroke='%2370AD47' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440L586 605.05L834.1 550.04H867V605.05L702.1 935H669.1H619.1L669.1 825.05L817.1 605.05H784.1L702.1 440Z' stroke='%23FFFDE4' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440L1032.11 385.04H1114.11H1131.11H1230L1147.11 55H1114.11H1032.11H949.11V110.03L537 418.04L702.1 440Z' stroke='%236BE585' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440.04H537.09L735.1 264.03H702.1L669.1 242.03L619.1 264.03V231.03L669.1 220L702.1 231.03L735.1 242.03L504 418.04L784 275.04L537.09 605L702.1 440.04Z' stroke='%2378FFDB' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/g%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='clip0_622_27'%3E%3Crect width='1650' height='990' fill='white' transform='translate(0.5)'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E",
		"data:image/svg+xml,%3Csvg width='1651' height='990' fill='none' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Cg clip-path='url(%23clip0_622_56)'%3E%3Cmask id='mask0_622_56' style='mask-type:luminance' maskUnits='userSpaceOnUse' x='0' y='0' width='1651' height='990'%3E%3Cpath d='M1650.5 0H0.5V990H1650.5V0Z' fill='white'/%3E%3C/mask%3E%3Cg mask='url(%23mask0_622_56)'%3E%3Cpath d='M702 440.04L999.11 165.032L1065.11 110.03L1114.11 88L1279 385.04L834.1 660L702 440.04Z' stroke='%23FFC000' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440.04L1032 110L619.1 660H570.1H916.11H537H784.1V220.03L702.1 440.04Z' stroke='%238360C3' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 440.04V825.05H735.1V880.06L768.1 935L1197 352.04L1164.11 330H1114.11L1081.11 352.04L702 440.04Z' stroke='%235B9BD5' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440L405.09 165.032H339.09H289V110.03H372.09V55H405.09H454.09L1032 330.04L702.1 440Z' stroke='%23C31432' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 440L207.08 550.04H174.08L207.08 605H124.08L75.0801 550.04H42V495.04H124.08H174.08L702 440Z' stroke='%23FF4B2B' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 440L1444.12 605.05H1494.13H1527.13H1609V660.05H1560.13H1494.13H1477.12L1444.12 715L702 440Z' stroke='%2370AD47' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440.04L735.1 275L586.1 638.05H619.1L916 605.05L537.09 638.05L867.1 660H504.09H454L471.09 638.05L454 605.05L702.1 440.04Z' stroke='%23F2727F' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440L586 605.05L834.1 550.04H867V605.05L702.1 935H669.1H619.1L669.1 825.05L817.1 605.05H784.1L702.1 440Z' stroke='%23FFFDE4' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440L1032.11 385.04H1114.11H1131.11H1230L1147.11 55H1114.11H1032.11H949.11V110.03L537 418.04L702.1 440Z' stroke='%236BE585' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440.04L817 550.04L454.09 440.04V418.04H421.09L372 440.04V385.04H421.09H454.09H504.09L784.1 242L504.09 605L702.1 440.04Z' stroke='%23ED7D31' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440.04H537.09L735.1 264.03H702.1L669.1 242.03L619.1 264.03V231.03L669.1 220L702.1 231.03L735.1 242.03L504 418.04L784 275.04L537.09 605L702.1 440.04Z' stroke='%2378FFDB' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/g%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='clip0_622_56'%3E%3Crect width='1650' height='990' fill='white' transform='translate(0.5)'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E",
		"data:image/svg+xml,%3Csvg width='1651' height='990' fill='none' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Cg clip-path='url(%23clip0_622_83)'%3E%3Cmask id='mask0_622_83' style='mask-type:luminance' maskUnits='userSpaceOnUse' x='0' y='0' width='1651' height='990'%3E%3Cpath d='M1650.5 0H0.5V990H1650.5V0Z' fill='white'/%3E%3C/mask%3E%3Cg mask='url(%23mask0_622_83)'%3E%3Cpath d='M702 440.04L999.11 165.032L1032.11 110.03H1065.11L1114 88L916.11 660H784.1L702 440.04Z' stroke='%238360C3' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440.04L735.1 825L619.1 660.05H570.1L537 638.05V660.05H834L784.1 220L702.1 440.04Z' stroke='%23ED7D31' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440.04L735.1 275L586 638H619.1L1279 385.04L1197.12 352.04L1164.11 330.04H1114.11L1081.11 352.04L702.1 440.04Z' stroke='%23FFC000' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 440L207.08 550.04H174.08L207.08 605H124.08L75.0801 550.04H42V495.04H124.08H174.08L702 440Z' stroke='%23FF4B2B' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440V825.05L735.1 880.06L768.1 935L916 605.05L867.1 660.05H504.09H454L471.09 638.05L454 605.05L702.1 440Z' stroke='%235B9BD5' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440L405.09 165.032H339.09H289V110.03H372.09V55H405.09H454.09L1032 330.04L702.1 440Z' stroke='%23C31432' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 440L1444.12 605.05H1494.13H1527.13H1609V660.05H1560.13H1494.13H1477.12L1444.12 715L702 440Z' stroke='%2370AD47' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440L586 605.05L834.1 550.04H867V605.05L702.1 935H669.1H619.1L669.1 825.05L817.1 605.05H784.1L702.1 440Z' stroke='%23FFFDE4' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440L1032.11 385.04H1114.11H1131.11H1230L1147.11 55H1114.11H1032.11H949.11V110.03L537 418.04L702.1 440Z' stroke='%236BE585' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440.04L817 550.04L454.09 440.04V418.04H421.09L372 440.04V385.04H421.09H454.09H504.09L784.1 242L504.09 605L702.1 440.04Z' stroke='%23FFFDE4' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440.04H537.09L735.1 264.03H702.1L669.1 242.03L619.1 264.03V231.03L669.1 220L702.1 231.03L735.1 242.03L504 418.04L784 275.04L537.09 605L702.1 440.04Z' stroke='%2378FFDB' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/g%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='clip0_622_83'%3E%3Crect width='1650' height='990' fill='white' transform='translate(0.5)'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E",
		"data:image/svg+xml,%3Csvg width='1654' height='986' fill='none' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Cg clip-path='url(%23clip0_622_110)'%3E%3Cmask id='mask0_622_110' style='mask-type:luminance' maskUnits='userSpaceOnUse' x='0' y='0' width='1654' height='986'%3E%3Cpath d='M1653.5 0H0.5V986H1653.5V0Z' fill='white'/%3E%3C/mask%3E%3Cg mask='url(%23mask0_622_110)'%3E%3Cpath d='M703.1 439L587.1 603.05L835.1 548.04H868.1L918 603.05L835.1 658L455 603.05L703.1 439Z' stroke='%23F2727F' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M703 439L1033.11 110.03H1066.11L1116.11 88L1281 384.04L1199.12 351.04L1165.11 329.04H1116.11L1083.11 351.04L703 439Z' stroke='%23FFC000' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M703.1 439L405.09 165.032H339.09H290V110.03H372.09V55H405.09H455.09L1033 329.04L703.1 439Z' stroke='%23C31432' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M703 439L1446.12 603.05H1496.13H1529.13H1612V658.05H1562.13H1496.13H1479.12L1446.12 712L703 439Z' stroke='%2370AD47' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M703.1 439V822.05H736.1V876.05L769.1 931L918 658.05H868.1H505.09H455L471.09 636.05L703.1 439Z' stroke='%235B9BD5' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M703 439L207.08 548.04H174.08L207.08 603H124.08L75.0801 548.04H42V493.04H124.08H174.08L703 439Z' stroke='%23FF4B2B' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M703.1 439.04L1000 165L620 636.05L868.1 603.05L703.1 931H670.1H620L785.1 658.05L818.1 603.05H785.1L703.1 439.04Z' stroke='%23FFFDE4' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M703.1 439.04H538.09L587.1 636.05L620.1 658.05H571.1L538.09 636.05V658.05L670.1 822L505 417.04L786 274L538.09 603.05L703.1 439.04Z' stroke='%238360C3' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M703.1 439L1033.11 384.04H1116.11H1132.11H1232L1149.11 55H1116.11H1033.11H951.11V110.03L538 417.04L703.1 439Z' stroke='%236BE585' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M703.1 439L736.1 274.04V263.03H703.1L670.1 241.03L620 263.03V230.03L670.1 220L703.1 230.03L736.1 241.03L786 220L703.1 439Z' stroke='%2378FFDB' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M703.1 439.04L819 548.04L455.09 439.04V417.04H422.09L372 439.04V384.04H422.09H455.09H505.09L785.1 241L505.09 603L703.1 439.04Z' stroke='%23ED7D31' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/g%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='clip0_622_110'%3E%3Crect width='1653' height='986' fill='white' transform='translate(0.5)'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E",
		"data:image/svg+xml,%3Csvg width='1651' height='990' fill='none' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Cg clip-path='url(%23clip0_622_137)'%3E%3Cmask id='mask0_622_137' style='mask-type:luminance' maskUnits='userSpaceOnUse' x='0' y='0' width='1651' height='990'%3E%3Cpath d='M1650.5 0H0.5V990H1650.5V0Z' fill='white'/%3E%3C/mask%3E%3Cg mask='url(%23mask0_622_137)'%3E%3Cpath d='M702.1 440.04L999 165L619 638.05L916.11 605.05L834.1 660L784.1 605.05L702.1 440.04Z' stroke='%23F2727F' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440V825.05H735.1V880.06L768.1 935L916 660.05H867.1H504.09H454L471.09 638.05L702.1 440Z' stroke='%235B9BD5' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 440L1444.12 605.05H1494.13H1527.13H1609V660.05H1560.13H1494.13H1477.12L1444.12 715L702 440Z' stroke='%2370AD47' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440L405.09 165.032H339.09H289V110.03H372.09V55H405.09H454.09L1032 330.04L702.1 440Z' stroke='%23C31432' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 440L207.08 550.04H174.08L207.08 605H124.08L75.0801 550.04H42V495.04H124.08H174.08L702 440Z' stroke='%23FF4B2B' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 440L1032.11 385.04H1114.11H1131.11H1230.12H1279L1197.12 352.04L1164.11 330H1114.11L1081.11 352.04L702 440Z' stroke='%23FFC000' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440L1032.11 110.03H1065.11L1114.11 88.029L1147 55H1114.11H1032.11H949.11V110.03L537 418.04L702.1 440Z' stroke='%236BE585' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440.04L817 550.04L586.1 638.05L619.1 660.05H570.1L537.09 638.05V660.05L669.1 825L504 418.04L784.1 275L537.09 605.05L702.1 440.04Z' stroke='%238360C3' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440L735.1 275.04V264.03H702.1L669.1 242.03L619 264.03V231.03L669.1 220L702.1 231.03L735.1 242.03L784 220L702.1 440Z' stroke='%2378FFDB' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440L586.1 605.05L834.1 550.04H867V605.05L702.1 935H669.1H619.1L784.1 660.05L817.1 605.05H454L702.1 440Z' stroke='%23FFFDE4' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440.04H537.09H454.09V418.04H421.09L372 440.04V385.04H421.09H454.09H504.09L784 242L504.09 605L702.1 440.04Z' stroke='%23ED7D31' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/g%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='clip0_622_137'%3E%3Crect width='1650' height='990' fill='white' transform='translate(0.5)'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E",
		"data:image/svg+xml,%3Csvg width='1651' height='990' fill='none' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Cg clip-path='url(%23clip0_622_164)'%3E%3Cmask id='mask0_622_164' style='mask-type:luminance' maskUnits='userSpaceOnUse' x='0' y='0' width='1651' height='990'%3E%3Cpath d='M1650.5 0H0.5V990H1650.5V0Z' fill='white'/%3E%3C/mask%3E%3Cg mask='url(%23mask0_622_164)'%3E%3Cpath d='M702 440.04L999 165L916.11 605.05L834.1 660L784.1 605.05L702 440.04Z' stroke='%23F2727F' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 440L1032.11 385.04H1114.11H1131.11H1230.12H1279L1197.12 352.04L1164.11 330H1114.11L1081.11 352.04L702 440Z' stroke='%23FFC000' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440L1032.11 110.03H1065.11L1114.11 88.029L1147 55H1114.11H1032.11H949.11V110.03L537 418.04L702.1 440Z' stroke='%236BE585' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440L405.09 165.032H339.09H289V110.03H372.09V55H405.09H454.09L1032 330.04L702.1 440Z' stroke='%23C31432' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 440L207.08 550.04H174.08L207.08 605H124.08L75.0801 550.04H42V495.04H124.08H174.08L702 440Z' stroke='%23FF4B2B' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440V825.05H735.1V880.06L768.1 935L916 660.05H867.1H504.09H454L471.09 638.05L702.1 440Z' stroke='%235B9BD5' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440L586 605.05L834.1 550.04H867V605.05L702.1 935H669.1H619.1L784.1 660.05L817.1 605.05L702.1 440Z' stroke='%23FFFDE4' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 440L1444.12 605.05H1494.13H1527.13H1609V660.05H1560.13H1494.13H1477.12L1444.12 715L702 440Z' stroke='%2370AD47' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440L735.1 275.04V264.03H702.1L669.1 242.03L619 264.03V231.03L669.1 220L702.1 231.03L735.1 242.03L784 220L702.1 440Z' stroke='%2378FFDB' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440H537.09H454.09V418.04H421.09L372 440V385.04H421.09H454.09H504.09L784 242V275.04L702.1 440Z' stroke='%23ED7D31' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440.04L817 550.04L586.1 638.05H619.1V660.05H570.1L537.09 638.05V660.05L669.1 825L504.09 418L454 605.05H504.09H537.09L702.1 440.04Z' stroke='%238360C3' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/g%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='clip0_622_164'%3E%3Crect width='1650' height='990' fill='white' transform='translate(0.5)'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E",
		"data:image/svg+xml,%3Csvg width='1652' height='986' fill='none' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Cg clip-path='url(%23clip0_622_191)'%3E%3Cmask id='mask0_622_191' style='mask-type:luminance' maskUnits='userSpaceOnUse' x='0' y='0' width='1652' height='986'%3E%3Cpath d='M1651.5 0H0.5V986H1651.5V0Z' fill='white'/%3E%3C/mask%3E%3Cg mask='url(%23mask0_622_191)'%3E%3Cpath d='M702.1 438.04L1000 164L702.1 931H669.1H620.1L669.1 821.05L504 416.04H537.09L702.1 438.04Z' stroke='%23FFFDE4' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 438V821.05H735.1V876.05L768.1 931L917 657.05H867.1H834.1L785.1 602.05L702 438Z' stroke='%235B9BD5' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 438L818.1 547.04H834.1H867.1V602.05H917L504.09 657H455L471.09 635.05L702.1 438Z' stroke='%23F2727F' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 438L405.09 164.032H339.09H290V109.03H372.09V54H405.09H455.09L702 438Z' stroke='%23C31432' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 438L207.08 547.04H174.08L207.08 602H125.08L75.0801 547.04H42V493.04H125.08H174.08L702 438Z' stroke='%23FF4B2B' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 438L587.1 602.05V635.05H620.1V657H570.1L537 635.05V657H785.1L818 602.05L702.1 438Z' stroke='%238360C3' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 438L1445.12 602.05H1495.13H1528.13H1610V657.05H1561.13H1495.13H1478.12L1445.12 712L702 438Z' stroke='%2370AD47' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 438L1032.11 109.03H1065.11L1115.11 87.029L1148 54H1115.11H1032.11H950.11V109.03L785.1 241.03V273.04L702 438Z' stroke='%236BE585' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 438L1032.11 383.04H1115.11H1132.11H1231.12H1280L1198.12 350.04L1165.11 328H1115.11L1082.11 350.04L1032.11 328L702 438Z' stroke='%23FFC000' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 438L735.1 273.04V263.03H702.1L669.1 241.03L620 263.03V230.03L669.1 219L702.1 230.03L735.1 241.03L785 219L702.1 438Z' stroke='%2378FFDB' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 438.04H537.09H455.09V416.04H422.09L372 438.04V383H422.09H455.09H504.09L455.09 602H504.09H537.09L702 438.04Z' stroke='%23ED7D31' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/g%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='clip0_622_191'%3E%3Crect width='1651' height='986' fill='white' transform='translate(0.5)'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E",
		"data:image/svg+xml,%3Csvg width='1653' height='994' fill='none' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Cg clip-path='url(%23clip0_622_218)'%3E%3Cmask id='mask0_622_218' style='mask-type:luminance' maskUnits='userSpaceOnUse' x='0' y='0' width='1653' height='994'%3E%3Cpath d='M1652.5 0H0.5V994H1652.5V0Z' fill='white'/%3E%3C/mask%3E%3Cg mask='url(%23mask0_622_218)'%3E%3Cpath d='M703 442L818.1 553.04H835.1H868V608L703 442Z' stroke='%23F2727F' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M703 442L405.09 166.032H339.09H290V111.03H372.09V55H405.09H455.09L703 442Z' stroke='%23C31432' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M703 442V829.05H736.1V884L918 608.05V663.05H868.1H835.1H785.1L818.1 608.05L703 442Z' stroke='%235B9BD5' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M703 442L207.08 553.04H174.08L207.08 608H125.08L75.0801 553.04H42V497.04H125.08H174.08L703 442Z' stroke='%23FF4B2B' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M703 442L1446.12 608.05H1496.13H1529.13H1611V663.05H1562.13H1496.13H1479.12L1446.12 718L703 442Z' stroke='%2370AD47' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M703 442L1033.11 111.03H1066.11L1116.11 88.029L1149 55H1116.11H1033.11H951.11V111.03L785.1 243.03V276.04L703 442Z' stroke='%236BE585' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M703.1 442.04L1000 166L769.1 939H703.1H670.1H620.1L670.1 829.05L505.09 420.04L455 608.05H505.09H538.09L703.1 442.04Z' stroke='%23FFFDE4' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M703 442L1033.11 387.04H1116.11H1132.11H1231.12H1281L1198.12 354.04L1165.11 332H1116.11L1083.11 354.04L1033.11 332L703 442Z' stroke='%23FFC000' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M703 442H538.09H455.09V420.04H422.09L372 442V387H422.09H455.09H505.09L538.09 420.04L703 442Z' stroke='%23ED7D31' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M703.1 442L736.1 276.04V265.04H703.1L670.1 243.03L620 265.04V232.03L670.1 221L703.1 232.03L736.1 243.03L785 221L703.1 442Z' stroke='%2378FFDB' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M703.1 442L587.1 608.05V641.05H620.1V663H571.1L538.09 641.05V663H505.09H455L472.09 641.05L785 608.05L703.1 442Z' stroke='%238360C3' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/g%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='clip0_622_218'%3E%3Crect width='1652' height='994' fill='white' transform='translate(0.5)'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E",
		"data:image/svg+xml,%3Csvg width='1651' height='990' fill='none' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Cg clip-path='url(%23clip0_622_245)'%3E%3Cmask id='mask0_622_245' style='mask-type:luminance' maskUnits='userSpaceOnUse' x='0' y='0' width='1651' height='990'%3E%3Cpath d='M1650.5 0H0.5V990H1650.5V0Z' fill='white'/%3E%3C/mask%3E%3Cg mask='url(%23mask0_622_245)'%3E%3Cpath d='M702 440L817.1 550H834.1H867L702 440Z' stroke='%23F2727F' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 440L405.09 165.032H339.09H289V110.03H372.09V55H405.09H454.09L702 440Z' stroke='%23C31432' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 440L207.08 550.04H174.08L207.08 605H124.08L75.0801 550.04H42V495.04H124.08H174.08L702 440Z' stroke='%23FF4B2B' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 440V825H735.1L867.1 605.05H916V660.05H867.1H834.1H784.1L817.1 605.05L702 440Z' stroke='%235B9BD5' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 440L1032.11 110.03H1065.11L1114.11 88.029L1147 55H1114.11H1032.11H949.11V110.03L784.1 220.03L702 440Z' stroke='%236BE585' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 440L1444.12 605.05H1494.13H1527.13H1609V660.05H1560.13H1494.13H1477.12L1444.12 715L702 440Z' stroke='%2370AD47' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440.04L999 165L735.1 880.06L768.1 935H702.1H669.1H619.1L669.1 825.05L454 605.05H504.09H537.09L702.1 440.04Z' stroke='%23FFFDE4' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 440L1032.11 385.04H1114.11H1131.11H1230.12H1279L1197.12 352.04L1164.11 330H1114.11L1081.11 352.04L1032.11 330L702 440Z' stroke='%23FFC000' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440L735.1 275.04V264.03H702.1L669.1 242.03L619 264.03V231.03L669.1 220L702.1 231.03L735.1 242.03H784V275.04L702.1 440Z' stroke='%2378FFDB' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440L586.1 605.05V638.05H619.1V660H570.1L537.09 638.05V660H504.09H454L471.09 638.05L784 605.05L702.1 440Z' stroke='%238360C3' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 440H537.09H454.09V418.04H421.09L372 440V385H421.09H454.09H504.09V418.04H537.09L702 440Z' stroke='%23ED7D31' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/g%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='clip0_622_245'%3E%3Crect width='1650' height='990' fill='white' transform='translate(0.5)'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E",
		"data:image/svg+xml,%3Csvg width='1651' height='990' fill='none' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Cg clip-path='url(%23clip0_622_272)'%3E%3Cmask id='mask0_622_272' style='mask-type:luminance' maskUnits='userSpaceOnUse' x='0' y='0' width='1651' height='990'%3E%3Cpath d='M1650.5 0H0.5V990H1650.5V0Z' fill='white'/%3E%3C/mask%3E%3Cg mask='url(%23mask0_622_272)'%3E%3Cpath d='M702.1 440V825.05H735.1V880.06L768 935H702.1H669L702.1 440Z' stroke='%235B9BD5' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 440L586.1 605.05V638.05L570.1 660L537.09 638.05V660H504L702 440Z' stroke='%238360C3' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 440L619.1 638.05V660.05V935L669.1 825.05L454 660.05L471.09 638.05L454 605.05L702 440Z' stroke='%23FFFDE4' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 440L999.11 165.032L1032.11 110.03H1065.11L1114.11 88.029L1147 55H1114.11H1032.11H949.11V110.03L702 440Z' stroke='%236BE585' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 440L1032.11 385.04H1114.11H1131.11H1230.12H1279L1197.12 352.04L1164.11 330H1114.11L1081.11 352.04L702 440Z' stroke='%23FFC000' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 440L207.08 550.04H174.08L207.08 605H124.08L75.0801 550.04H42V495.04H124.08H174.08L702 440Z' stroke='%23FF4B2B' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440L405.09 165.032H339.09H289V110.03H372.09V55H405.09H454.09L1032 330.04L702.1 440Z' stroke='%23C31432' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 440L817.1 550.04H834.1H867.1V605.05H916V660H867.1H834.1H784.1L817.1 605.05L702 440Z' stroke='%23F2727F' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702 440H537.09H454.09V418.04H421.09L372 440V385H421.09H454.09H504.09V418.04H537.09L702 440Z' stroke='%23ED7D31' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440L1444.12 605.05H1494.13H1527.13H1609V660.05H1560.13H1494.13H1477.12L1444.12 715L784.1 605.05H504H537.09L702.1 440Z' stroke='%2370AD47' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M702.1 440L735.1 275.04V264.03H702.1L669.1 242.03L619 264.03V231.03L669.1 220L702.1 231.03L735.1 242.03L784 220V242.03V275.04L702.1 440Z' stroke='%2378FFDB' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/g%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='clip0_622_272'%3E%3Crect width='1650' height='990' fill='white' transform='translate(0.5)'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E",
		"data:image/svg+xml,%3Csvg width='1654' height='986' fill='none' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Cg clip-path='url(%23clip0_622_299)'%3E%3Cmask id='mask0_622_299' style='mask-type:luminance' maskUnits='userSpaceOnUse' x='0' y='0' width='1654' height='986'%3E%3Cpath d='M1653.5 0H0.5V986H1653.5V0Z' fill='white'/%3E%3C/mask%3E%3Cg mask='url(%23mask0_622_299)'%3E%3Cpath d='M703.1 438V822.05H736.1V877.05L769 931H703.1H670.1H621L670.1 822.05L703.1 438Z' stroke='%235B9BD5' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M703 438L406.09 164.032H340.09H290V110.03H373.09V55H406.09H455.09L703 438Z' stroke='%23C31432' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M703 438L208.08 548.04H175.08L208.08 603H125.08L75.0801 548.04H42V493.04H125.08H175.08L703 438Z' stroke='%23FF4B2B' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M703 438L1001.11 164.032L1034.11 110.03H1067.11L1116.11 88.029L1149 55H1116.11H1034.11H951.11V110.03L703 438Z' stroke='%236BE585' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M703 438L819.1 548.04H835.1H868.1V603.05H918V658H868.1H835.1H786.1L819.1 603.05L703 438Z' stroke='%23F2727F' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M703 438L1447.12 603.05H1496.13H1529.13H1612V657.05H1562.13H1496.13H1480.12L1447.12 712L786.1 603.05L703 438Z' stroke='%2370AD47' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M703.1 438L736.1 274.04V263.03H703.1L670.1 241.03L621 263.03V230.03L670.1 219L703.1 230.03L736.1 241.03L786 219V241.03L703.1 438Z' stroke='%2378FFDB' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M703 438H538.09H455.09V416.04H422.09L373 438V384H422.09H455.09H505.09V416.04H538.09L703 438Z' stroke='%23ED7D31' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M703 438L1034.11 384.04H1116.11H1133.11H1232.12H1282L1199.12 351.04L1166.11 329.04H1116.11L1083.11 351.04L1034.11 329.04L786.1 274L703 438Z' stroke='%23FFC000' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M703 438L588.1 603.05V636.05H621.1V658H571.1L538.09 636.05V658H505.09H455L472.09 636.05L455 603.05H505.09H538.09L703 438Z' stroke='%238360C3' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/g%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='clip0_622_299'%3E%3Crect width='1653' height='986' fill='white' transform='translate(0.5)'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E",
		"data:image/svg+xml,%3Csvg width='1650' height='990' fill='none' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Cg clip-path='url(%23clip0_622_2)'%3E%3Cmask id='mask0_622_2' style='mask-type:luminance' maskUnits='userSpaceOnUse' x='0' y='0' width='1650' height='990'%3E%3Cpath d='M1650 0H0V990H1650V0Z' fill='white'/%3E%3C/mask%3E%3Cg mask='url(%23mask0_622_2)'%3E%3Cpath d='M701 440L404.09 165.032H338.09H288V110.03H371.09V55H404.09H453.09L701 440Z' stroke='%23C31432' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M701.1 440V825.05H734.1V880.06L767 935H701.1H668.1H618L668.1 825.05L701.1 440Z' stroke='%235B9BD5' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M701 440L998.11 165.032L1031.11 110.03H1064.11L1113.11 88.029L1146 55H1113.11H1031.11H948.11V110.03L701 440Z' stroke='%236BE585' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M701 440L1443.12 605.05H1493.13H1526.13H1608V660.05H1559.13H1493.13H1476.12L1443.12 715L701 440Z' stroke='%2370AD47' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M701 440L206.08 550.04H173.08L206.08 605H123.08L74.0801 550.04H41V495.04H123.08H173.08L701 440Z' stroke='%23FF4B2B' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M701 440L1031.11 385.04H1113.11H1130.11H1229.12H1278L1196.12 352.04L1163.11 330H1113.11L1080.11 352.04L1031.11 330L701 440Z' stroke='%23FFC000' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M701 440L816.1 550.04H833.1H866.1V605.05H915V660H866.1H833.1H783.1L816.1 605.05H783.1L701 440Z' stroke='%23F2727F' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M701 440H536.09H453.09V418.04H420.09L371 440V385H420.09H453.09H503.09V418.04H536.09L701 440Z' stroke='%23ED7D31' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M701.1 440L734.1 275.04V264.03H701.1L668.1 242.03L618 264.03V231.03L668.1 220L701.1 231.03L734.1 242.03L783 220V242.03V275.04L701.1 440Z' stroke='%2378FFDB' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M701 440L585.1 605.05V638.05H618.1V660H569.1L536.09 638.05V660H503.09H453L470.09 638.05L453 605.05H503.09H536.09L701 440Z' stroke='%238360C3' stroke-width='6.875' stroke-miterlimit='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/g%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='clip0_622_2'%3E%3Crect width='1650' height='990' fill='white'/%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E",
	],

	chessBoardColours: {
		"odd": getComputedStyle(document.documentElement).getPropertyValue("--chess-board-odd"),
		"even": getComputedStyle(document.documentElement).getPropertyValue("--chess-board-even"),
		"odd-error": getComputedStyle(document.documentElement).getPropertyValue("--chess-board-error-odd"),
		"even-error": getComputedStyle(document.documentElement).getPropertyValue("--chess-board-error-even"),
		"odd-valid": getComputedStyle(document.documentElement).getPropertyValue("--chess-board-valid-odd"),
		"even-valid": getComputedStyle(document.documentElement).getPropertyValue("--chess-board-valid-even")
	}
}