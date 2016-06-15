var fs = require('fs'),
    path = require('path'),
    moment = require('moment'),
    _ = require('underscore');

// This uses sync-request rather than the standar request module
var SyncRequest = require('sync-request');
// Sample sync request to Postcode.io
// console.log(JSON.parse(SyncRequest('GET', 'https://api.postcodes.io/postcodes/LS14 5QL').body).result);

var postcodeFilePath = path.join(path.dirname(fs.realpathSync(__filename)),'data', 'postcodes.json');
var PostcodeDB = {
    initialized: false,
    existingData: null,
    init: function() {
        console.log(postcodeFilePath);
        if (fs.existsSync(postcodeFilePath)) {
            this.existingData = require('./data/postcodes.json');
        } else {
            console.log('postcode file does not exist')
        }
        this.initialized = true;
    },
    requestPostcodes: function(postcodes) {
        if (postcodes.length == 1) {
            return JSON.parse(SyncRequest('GET', 'https://api.postcodes.io/postcodes/' + postcodes[0]).body).result;
        } else {
            return SyncRequest('POST', 'https://api.postcodes.io/postcodes',
                { data: { postcodes: postcodes } });
        }
    },
    update: function(postcodes, callback) {
        console.log('Postcode Update ');
        var pc_buffer = [];
        var cache_updated = false
        var _this = this;
        var foundPostcodes = [];
        for (var i = 0; i < postcodes.length; ++i) {
            if (!(postcodes[i] in _this.existingData)) {
                var pc = postcodes[i];
                if (!_.isEmpty(pc)) {
                    cache_updated = true
                    if (pc_buffer.length == 100) {
                        var newPostcodes = _this.requestPostcodes(pc_buffer);
                        if (_.isEmpty(newPostcodes)) {
                            foundPostcodes.push(newPostcodes)
                        }
                        pc_buffer = []
                    } else {
                        pc_buffer.push(pc)
                    }
                }
            }
        }

        if (pc_buffer.length > 0) {
            foundPostcodes.push(_this.requestPostcodes(pc_buffer))
        }
        
        console.log('Postcode Update - Found Postcodes = ' + foundPostcodes.length);        

        for (var i = 0; i < foundPostcodes.length; ++i) {
            var pc = foundPostcodes[i];
            if (!_.isEmpty(pc)) {
                _this.existingData[pc.postcode] = foundPostcodes[i];
            }
        }

        if (cache_updated) {
            // this.saveCachedItems();
            // runs too often with lots of individual searches
        }

        return foundPostcodes[0];
    },
    saveCachedItems: function() {
        console.log('SAVING CACHED EXISTING POSTCODE DATA');
        fs.writeFile(postcodeFilePath, JSON.stringify(this.existingData),function(err){
            if(err) {
                console.log(err);
            }
        })
    },
    get: function(postcode) {
        if (!this.initialized) {
            this.init();
        }
        if (!(postcode in this.existingData)) {
            console.log('Postcode does not exist: ' + postcode);
            return this.update([postcode]);
        } else {
            return this.existingData[postcode];
        }
    }
}
// Sample usage to find postcode
// var postcode = PostcodeDB.get('LS14 2HB');
// console.log('postcode = ' + JSON.stringify(postcode));

// After running queries use PostcodeDB.saveCachedItems() 
//     to save any newly found postcodes to the json file

module.exports = PostcodeDB;