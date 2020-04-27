"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hap_nodejs_1 = require("hap-nodejs");
const uuid_1 = require("hap-nodejs/dist/lib/util/uuid");
const logger_1 = require("homebridge/lib/logger");
const platformAccessory_1 = require("homebridge/lib/platformAccessory");
const isy_nodejs_1 = require("isy-nodejs");
const plugin_1 = require("./plugin");
class AccessoryContext {
}
exports.AccessoryContext = AccessoryContext;
(platformAccessory_1.PlatformAccessory.prototype).getOrAddService = function (service) {
    const acc = this;
    const serv = acc.getService(service);
    if (!serv) {
        return acc.addService(service);
    }
    return serv;
};
class ISYAccessory {
    constructor(device) {
        const s = uuid_1.generate(`${device.isy.address}:${device.address}1`);
        /// super(device.displayName, s);
        this.UUID = s;
        this.name = device.name;
        this.displayName = device.displayName;
        // super(device.name,hapNodeJS.uuid.generate(device.isy.address + ":" + device.address))
        this.logger = new logger_1.Logger(`${plugin_1.PlatformName}: ${this.name}`);
        this.device = device;
        this.address = device.address;
        this.context = new AccessoryContext();
        this.context.address = this.address;
        this.device.on('PropertyChanged', this.handlePropertyChange.bind(this));
    }
    // tslint:disable-next-line: ban-types
    bind(func) {
        return func.bind(this.device);
    }
    map(propertyName, propertyValue) {
        //let output = {characteristic: Characteristic, service: typeof Service};
        if (propertyName === 'ST') {
            return { characteristicValue: propertyValue, characteristic: hap_nodejs_1.Characteristic.On, service: this.primaryService };
        }
        return { characteristicValue: propertyValue, service: this.primaryService };
    }
    configure(accessory) {
        if (accessory) {
            if (!accessory.getOrAddService) {
                accessory.getOrAddService = platformAccessory_1.PlatformAccessory.prototype.getOrAddService.bind(accessory);
            }
            this.platformAccessory = accessory;
            this.platformAccessory.context.address = this.address;
            this.logger.info('Configuring linked platform accessory');
        }
        else {
            this.platformAccessory = new platformAccessory_1.PlatformAccessory(this.displayName, this.UUID, this.category);
            this.platformAccessory.context.address = this.address;
            this.logger.info('New platform accessory needed');
        }
        this.setupServices();
        this.primaryService.isPrimaryService = true;
        this.platformAccessory.on('identify', () => this.identify.bind(this));
    }
    setupServices() {
        var _a, _b, _c, _d;
        this.informationService = this.platformAccessory.getOrAddService(hap_nodejs_1.Service.AccessoryInformation);
        this.informationService
            .getCharacteristic(hap_nodejs_1.Characteristic.Manufacturer).updateValue((_a = isy_nodejs_1.Family[this.device.family], (_a !== null && _a !== void 0 ? _a : 'Universal Devices, Inc.')));
        this.informationService.getCharacteristic(hap_nodejs_1.Characteristic.Model).updateValue((_b = this.device.productName, (_b !== null && _b !== void 0 ? _b : this.device.name)));
        this.informationService.getCharacteristic(hap_nodejs_1.Characteristic.SerialNumber).updateValue((_c = this.device.modelNumber, (_c !== null && _c !== void 0 ? _c : this.device.address)));
        this.informationService.getCharacteristic(hap_nodejs_1.Characteristic.FirmwareRevision).updateValue((_d = this.device.version, (_d !== null && _d !== void 0 ? _d : '1.0')));
        // .setCharacteristic(Characteristic.ProductData, this.device.address);
    }
    handlePropertyChange(propertyName, value, oldValue, formattedValue) {
        const name = propertyName in isy_nodejs_1.Controls ? isy_nodejs_1.Controls[propertyName].label : propertyName;
        this.logger.debug(`Incoming update to ${name}. New Value: ${value} (${formattedValue}) Old Value: ${oldValue}`);
        const m = this.map(propertyName, value);
        if (m.characteristic) {
            this.logger.debug('Property mapped to:', m.service.name, m.characteristic.name);
            this.updateCharacteristicValue(m.characteristicValue, m.characteristic, m.service);
        }
        else {
            this.logger.info('Property not mapped.');
        }
    }
    updateCharacteristicValue(value, characteristic, service) {
        var _a;
        (_a = service.getCharacteristic(characteristic)) === null || _a === void 0 ? void 0 : _a.updateValue(value);
    }
    convertToHK(propertyName, value) {
        return value;
    }
    identify() {
        // Do the identify action
    }
}
exports.ISYAccessory = ISYAccessory;
//# sourceMappingURL=ISYAccessory.js.map