
$(document).ready(function(){
    //A variable that represents the default value for the calculator
    var DEFAULT_VALUE = 0;
    //When the user clicks on "send" button
    $("#details-form" ).submit(function( event ) {
        //Check if the user inserts the right user name and password
        if (($("#username").val()==="admin") && ($("#passwordinput").val() ==="admin")  ) {
            //Hide the start page and show the calculator.
            $(".start-page").hide();
            $("div.calculator").show();
            event.preventDefault();
            }
        else{
            alert("wrong user name/password")
            event.preventDefault();

        }
    });
    //When the er user clicks on the setting button
    $("#settings-button").click(function(){
        //Opens the dialog windows
        $( "#dialog" ).dialog({
                       buttons: {
                           "Change": function() {
                               //If the user clicks on the change button, changes the deault value of the calculator
                               var default_screen= parseInt($('input[name="change-default"]').val());
                               calculator.change_default(default_screen);
                                $('input[name="change-default"]').val("0");
                                $( this ).dialog( "close" );
                           },
                           Cancel: function() {
                               $( this ).dialog( "close" );
                           }
                       }
                   });

    });
    //When the user clicks on the 'clear button' restore the value of the calculator
    $("#clear-button").click(function(){
        var result = calculator.clear();
        $("#screen-text").val(result);
        $("#insertInput").val("0");
    });

    //When the user clicks on the 'plus button' adding the numbers
    $("#plus-button").click(function(){
        //The number that the user inserted
        var input =  parseInt($("#insertInput").val());
        //The result of the adding
        var result = calculator.add(input);

        $("#screen-text").val(result);
        $("#insertInput").val("0");
    });

    //When the user clicks on the 'plus button' adding the numbers
    $("#mult-button").click(function(){
        //The number that the user inserted
        var input =  parseInt($("#insertInput").val());
        //The result of the adding
        var result = calculator.mult(input);
        $("#screen-text").val(result);
        $("#insertInput").val("0");
       });
    //checks if the  user typing is legal
    $('#insertInput').keypress(function(evt)
    {
        var charCode = (evt.charCode) ? evt.which : event.keyCode
        //If the key of the input is not represents a legal number.
        if (!(charCode>= 48 && charCode <= 57) || charCode==8) // Interval of values (0-9) or delete
        {
            alert("You can only insert non-negative integer");
            evt.preventDefault();
            return false;
        }
    });
    //initializes all the input fields
    $("#screen-text").val(DEFAULT_VALUE);
    $('input[name="change-default"]').val("0");
    $("#insertInput").val("0");
    $("#screen-text").prop('disabled', true);
    //The calculator object
    function Calculator(defaultValue){
        //The default number of the calculator
        var default_value = defaultValue;
        //The current number of the calculator
        var current_value =  default_value;
        this.add = function(num){
            current_value = (current_value + num)
            return current_value;
        }
        this.mult= function(num){
            current_value = (current_value * num)
            return current_value;
        }
        this.clear = function (){
            current_value = default_value;
            return default_value;
        }
        this.change_default = function (num){
            default_value = num;
        }
    }
    //Creates the calculator object with is default number
    var calculator = new Calculator(DEFAULT_VALUE);

});