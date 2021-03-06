import './utils';

import { Categories } from 'hap-nodejs';
import { ELKAlarmPanelDevice } from 'isy-nodejs';

import { AlarmMode } from 'isy-nodejs/lib/Devices/Elk/ElkAlarmPanelDevice';
import { ISYAccessory } from './ISYAccessory';
import { Characteristic, Service } from './plugin';

export class ISYElkAlarmPanelAccessory extends ISYAccessory<ELKAlarmPanelDevice, Categories.ALARM_SYSTEM> {
	public alarmPanelService: any;

	// Handles the request to set the alarm target state
	public setAlarmTargetState(targetStateHK: any, callback: () => void) {
		this.logger.info(`ALARMSYSTEM: ${this.device.name} Sending command to set alarm panel state to: ${targetStateHK}`);
		const targetState = this.translateHKToAlarmTargetState(targetStateHK);
		this.logger.info(`ALARMSYSTEM: ${this.device.name} Would send the target state of: ${targetState}`);
		if (this.device.getAlarmMode() !== targetState) {
			// tslint:disable-next-line: only-arrow-functions
			this.device.sendSetAlarmModeCommand(targetState.toString());
		} else {
			this.logger.info(`ALARMSYSTEM: ${this.device.name} Redundant command, already in that state.`);
			callback();
		}
	}
	// Translates from the current state of the elk alarm system into a homekit compatible state. The elk panel has a lot more
	// possible states then can be directly represented by homekit so we map them. If the alarm is going off then it is tripped.
	// If it is arming or armed it is considered armed. Stay maps to the state state, away to the away state, night to the night
	// state.
	public translateAlarmCurrentStateToHK() {
		const tripState = this.device.getAlarmTripState();
		const sourceAlarmState = this.device.getAlarmState();
		const sourceAlarmMode = this.device.getAlarmMode();
		if (tripState >= this.device.ALARM_TRIP_STATE_TRIPPED) {
			return Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED;
		} else if (sourceAlarmState === this.device.ALARM_STATE_NOT_READY_TO_ARM || sourceAlarmState === this.device.ALARM_STATE_READY_TO_ARM || sourceAlarmState === this.device.ALARM_STATE_READY_TO_ARM_VIOLATION) {
			return Characteristic.SecuritySystemCurrentState.DISARMED;
		} else {
			if (sourceAlarmMode === AlarmMode.STAY || sourceAlarmMode === AlarmMode.STAY_INSTANT) {
				return Characteristic.SecuritySystemCurrentState.STAY_ARM;
			} else if (sourceAlarmMode === AlarmMode.AWAY || sourceAlarmMode === AlarmMode.VACATION) {
				return Characteristic.SecuritySystemCurrentState.AWAY_ARM;
			} else if (sourceAlarmMode === AlarmMode.NIGHT || sourceAlarmMode === AlarmMode.NIGHT_INSTANT) {
				return Characteristic.SecuritySystemCurrentState.NIGHT_ARM;
			} else {
				this.logger.info(`ALARMSYSTEM: ${this.device.name} Setting to disarmed because sourceAlarmMode is ${sourceAlarmMode}`);
				return Characteristic.SecuritySystemCurrentState.DISARMED;
			}
		}
	}
	// Translates the current target state of hthe underlying alarm into the appropriate homekit value
	public translateAlarmTargetStateToHK() {
		const sourceAlarmState = this.device.getAlarmMode();
		if (sourceAlarmState === AlarmMode.STAY || sourceAlarmState === AlarmMode.STAY_INSTANT) {
			return Characteristic.SecuritySystemTargetState.STAY_ARM;
		} else if (sourceAlarmState === AlarmMode.AWAY || sourceAlarmState === AlarmMode.VACATION) {
			return Characteristic.SecuritySystemTargetState.AWAY_ARM;
		} else if (sourceAlarmState === AlarmMode.NIGHT || sourceAlarmState === AlarmMode.NIGHT_INSTANT) {
			return Characteristic.SecuritySystemTargetState.NIGHT_ARM;
		} else {
			return Characteristic.SecuritySystemTargetState.DISARM;
		}
	}
	// Translates the homekit version of the alarm target state into the appropriate elk alarm panel state
	public translateHKToAlarmTargetState(state: number) {
		if (state === Characteristic.SecuritySystemTargetState.STAY_ARM) {
			return AlarmMode.STAY;
		} else if (state === Characteristic.SecuritySystemTargetState.AWAY_ARM) {
			return AlarmMode.AWAY;
		} else if (state === Characteristic.SecuritySystemTargetState.NIGHT_ARM) {
			return AlarmMode.NIGHT;
		} else {
			return AlarmMode.DISARMED;
		}
	}
	// Handles request to get the target alarm state
	public getAlarmTargetState(callback: (arg0: null, arg1: number) => void) {
		callback(null, this.translateAlarmTargetStateToHK());
	}
	// Handles request to get the current alarm state
	public getAlarmCurrentState(callback: (arg0: null, arg1: number) => void) {
		callback(null, this.translateAlarmCurrentStateToHK());
	}
	// Mirrors change in the state of the underlying isj-js device object.
	public handlePropertyChange(propertyName: string, value: any, oldValue: any, formattedValue: string) {
		super.handlePropertyChange(propertyName, value, oldValue, formattedValue);
		this.info(`ALARMPANEL: ${this.device.name} Source device. Currenty state locally -${this.device.getAlarmStatusAsText()}`);
		this.info(`ALARMPANEL: ${this.device.name} Got alarm change notification. Setting HK target state to: ${this.translateAlarmTargetStateToHK()} Setting HK Current state to: ${this.translateAlarmCurrentStateToHK()}`);
		this.alarmPanelService.setCharacteristic(Characteristic.SecuritySystemTargetState, this.translateAlarmTargetStateToHK());
		this.alarmPanelService.setCharacteristic(Characteristic.SecuritySystemCurrentState, this.translateAlarmCurrentStateToHK());
	}
	// Returns the set of services supported by this object.
	public setupServices() {
		super.setupServices();

		this.alarmPanelService = this.addService(Service.SecuritySystem);
		this.alarmPanelService.getCharacteristic(Characteristic.SecuritySystemTargetState).on('set', this.setAlarmTargetState.bind(this));
		this.alarmPanelService.getCharacteristic(Characteristic.SecuritySystemTargetState).on('get', this.getAlarmTargetState.bind(this));
		this.alarmPanelService.getCharacteristic(Characteristic.SecuritySystemCurrentState).on('get', this.getAlarmCurrentState.bind(this));

	}
}
