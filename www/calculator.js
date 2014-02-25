/*
Calculator definition for exercise 2.

Author: Eran Rosenthal 201636404
*/

/* ***************** Calculator ***************/
/*
 * Logic model for calculator
*/
function Calculator() {
	this._value = Calculator.defaultValue;
	
	/*
	Global context support. this allows var x=new Calculator(); var add=x.add; add(5);
	we could do it for all the methods (including getValue) by iterating the object,
	but it is ugly so I'm adding the minimal support for global context calls to methods
	(only the required method in the exercise)
	*/
	var self = this;
	$.each( [ 'add', 'multiply', 'clear' ], function( i, action ) {
		self[action] = self[action].bind( self );
	});
}

Calculator.defaultValue = 0;

Calculator.prototype = {
	/*
	 * Adds a number to the current value
	*/
	add: function( val ) {
		this._value += val;
	},
	/*
	 * Multiply by number the current value
	*/
	multiply: function( val ) {
		this._value *= val;
	},
	/*
	 * Clears the current value and replace it with default value
	*/
	clear: function() {
		this._value = Calculator.defaultValue;
	},
	getValue: function() {
		return this._value;
	}
}

/* ************** Calculator controller *****************/
/*
 * binds the view and the model
*/
function bindCalculatorModelView( model, view ) {
	/* 
	 For binding the view to calculator we could either use the global context Calculator
	 or the specific instance. Since we do have access to specific instance it is better to use it
	*/	
	$.each( [ 'add', 'multiply', 'clear' ], function( i, action ) {
		var boundMethod = model[action].bind( model );
		view[action].click( function() {
			boundMethod( parseInt(view.input.val()) );
			// update the screen after action
			view.screen.val( model.getValue() );
		} );
	});

	view.screen.val( model.getValue() );
}


/* ************** Calculator view functions *****************/
function validateInt( input, allowNegative ) {
	var lastValid = 0;
	//we bind both keyup and change since keyup is triggered only for the focused element
	// but if you press on 'a' (and without pressing up) clicks somewhere the keyup won't called)
	input.on('keyup change', function () {
		var val = this.value;
		var intVal = parseInt( val );
		if ( val == intVal && (allowNegative || intVal>=0 ) ) {
			lastValid = this.value;
		} else if ( val.length === 0 ) {
			lastValid = this.value;//consider empty as 0
		} else {
			this.value = lastValid;
		}
	} );
}

/*
 * Creates and shows a dialog to select the default value for the calculator
*/
function selectDefaultVal() {
	var defaultDialog = $('<div>Enter default value:</div>');
	var defaultVal = $('<input type="text" value="'+Calculator.defaultValue+'" / >');
	validateInt( defaultVal, true );
	defaultDialog.append(defaultVal).dialog({
		title: 'Default value',
		buttons: {
			'OK': function() {
				Calculator.defaultValue = parseInt( defaultVal.val() );
				defaultDialog.dialog('close');
				defaultDialog.remove();
			}
		}
	});
}

/*
 * Shows a new calculator
*/
function showCalculator() {
	var calcModel = new Calculator();
	var calcView = {
		add: $('<button>+</button>').button().prop('title','+'),
		multiply: $('<button>&times;</button>').button().prop('title','*'),
		clear: $('<button>Clear</button>').button().prop('title','Clears the screen and input'),
		screen: $('<input id="inputScreen" class="ui-widget" type="text" readonly/>'),
		input: $('<input class="ui-widget" type="text" />'),
		settings: $('<button>Settings</button>').button( {
			   icons: {
				primary: "ui-icon-gear"
			   }, 
			   text: false
			  }).prop('title','Settings')
			  .click(function(){
				selectDefaultVal();
			  })
	}

	validateInt( calcView.input, false );
	bindCalculatorModelView(calcModel, calcView);

	var calcWrapper = $('<div>').addClass('calcWrapper');
	calcWrapper.append(calcView.screen)
		   .append($('<div class="calcActionButtons"></div>').append([calcView.add, calcView.multiply, calcView.clear, calcView.settings]))
		   .append(calcView.input);
	$('#contentWrapper').html(calcWrapper.hide());
	calcWrapper.show('explode');
}
