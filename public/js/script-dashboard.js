var api = new APIManager();
var temperatureInfo = null;
var updater = null;
var connectSpinner = null;
var tempSpinner = null;

if (!api.loggedIn) {
    $('.taircoon-blocks').hide();
    $('.taircoon-connect').show();
	$('.status .current-status').html('Not connected');
} else {
    $('.taircoon-blocks').show();
    $('.taircoon-connect').hide();
	$('.status .current-status').html('Monitoring climate');
}

$("[data-action=login]").on('click', login);
$("[data-action=state]").on('click', 'button', changeState);
$("[data-action=toggleProgram]").on('click', toggleProgram);
$("[data-action=temperature]").on('click', temperatureChange);

function login(event) {
    event.preventDefault();

	$('#connect').html('');
	connectSpinner = new Spinner({color:'#fff'}).spin(document.getElementById('connect'));

    api.login(function () {
        // It is possible to have more than one display per customer, if that is the case, we are showing the agreements
        // and the user has to pick one. (If not, just select the first one)
        api.getAgreements(function(agreements) {
            switch (agreements.length) {
                case 0:
                    console.error('There are no agreements registered for this user. Contact support');
                    break;
                case 1:
                    selectAgreement(agreements[0].agreementId);
                    break;
                default:
                    showAgreements(agreements);
            }
        });
    });
}

function showAgreements(agreements) {
    //This should display the agreements, and the user does the selection.
    console.log(agreements);
}

function selectAgreement(agreementId) {
    api.selectAgreement(agreementId, function() {
        $('.taircoon-blocks').show();
        $('.taircoon-connect').hide();
		$('.status .current-status').html('Monitoring climate');

        initProgramStates();

		connectSpinner.stop();
		tempSpinner = new Spinner({color:'#fff'}).spin(document.getElementById('tempSpinner'));
		$('#tempSpinner').show();

        //Enable the interval-update!
        updater = new StatusUpdater(statusParser);
    });
}

function changeState(event) {
    event.preventDefault();

    var button = $(event.currentTarget);
    var buttons = button.parent().find("button");

    buttons.removeClass('selected');
    button.addClass('selected');

    updater.pause(function () {
        //send the call to the api
        api.setDisplayToState(0, button.index());
    });
}

function toggleProgram(event) {
    event.preventDefault();

    var button = $(event.currentTarget);
    var state = button.hasClass('active');

    $('.thermostat-program .switch').toggleClass('active');

    updater.pause(function () {
        //send the call to the api
        api.setProgram(!state);
    });
}

function temperatureChange(event) {

    if ($(event.currentTarget).data('type') == "up") {
        temperatureInfo.currentSetpoint += 50;
    } else {
        temperatureInfo.currentSetpoint -= 50;
    }

    $('.temperature').html(formatTemperature(temperatureInfo.currentSetpoint));

    updater.pause(function () {
        //send the call to the api
        api.setTemperature(temperatureInfo.currentSetpoint);
    });
}

function initProgramStates() {
    var error = function (error) {
        console.log(error);
    };
    api.getProgramStates(programEvent, error);
}

function statusParser(update) {
    if (!update) {
        //nothing changed!
        return;
    }
    if (update.thermostatInfo) {
        temperatureEvent(update.thermostatInfo);
    }
    if (update.thermostatStates) {
        programEvent(update.thermostatStates);
    }

}

function temperatureEvent(info) {

    difference = info.currentSetpoint - info.currentDisplayTemp;
    console.log(difference);

    if (difference >= 0) {
        aircoChange('on');
    } else {
        aircoChange('off');
    }

    //Update the global variable, so we can use that when changing the temperature
    temperatureInfo = info;

    if (info.programState !== null && info.programState == "0" || info.programState == "8") {
        $('.thermostat-program .switch').removeClass('active');
    } else {
        $('.thermostat-program .switch').addClass('active');
    }

    var temp = formatTemperature(parseFloat(info.currentDisplayTemp));
    var setpoint = formatTemperature(parseFloat(info.currentSetpoint));

    if (info.currentDisplayTemp != info.currentSetpoint) {
        $('.set-temperature').html(formatTemperature(setpoint));
    }
    if (info.activeState != -1) {
        $('.state-buttons .state-button:nth(' + info.activeState + ')').addClass('selected');
    }

	if (tempSpinner != null) {
		$('#tempSpinner').hide();
		$('#temperature').show();
		tempSpinner = null;
	}

    $('.temperature').html(temp);
}

function programEvent(states) {
    var programButtons = $('.state-buttons .state-button');

    for (var i = 0; i < states.length; i++) {
        var tempString = formatTemperature(parseFloat(states[i].tempValue));

        $(programButtons[i]).find('.temp').html(tempString);
    }
}

//Met dank aan Tristan
function aircoChange(switcheroo) {

    if (switcheroo == "on") {
        //Zet de airco uit
        api.setAirco(0, wallPlugUUID);
    }
    if (switcheroo == "off") {
        //Zet de airco aan
        api.setAirco(1, wallPlugUUID);
    }
}