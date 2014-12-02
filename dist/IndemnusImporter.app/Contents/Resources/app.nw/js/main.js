/**
 * Created by richardbrash on 11/26/14.
 */

var xmlrpc = require('xmlrpc');
var human = require('humanparser');
var async = require('async');

jQuery.extend({
    percentage: function(a, b) {
        return Math.round((a / b) * 100);
    }
});


function Contact(){
    var self = this;

    self.Id = ko.observable();
    self.FirstName = ko.observable();
    self.LastName = ko.observable();
    self.MiddleName = ko.observable();
    self.State = ko.observable(); // state
    self.Birthday = ko.observable(); //client_birth_date_one
    self._Carrier = ko.observable(); // carrier
    self._PolicyNumber0 = ko.observable(); //policy
    self._PolicyEffectiveDate = ko.observable(); // placed_date
    //  ClassName not present
    self._FaceAmount0 = ko.observable(); //face_amount
    self._Plan = ko.observable(); //product
    //  Annual Premium not present
    // Mode not present
    self._ModePremium = ko.observable(); //modal_premium
    //  Base premium not present
    //  Plan category not present
    self._PlanType = ko.observable(); // product_type
    self._Status = ko.observable(); // status

    self.importThis = ko.observable(false);
    self.importSuccess = ko.observable(false);
    self.importError = ko.observable(false);
    self.errorMessage = ko.observable();
    self.matchedMethod = ko.observable();

    self.importStatus = ko.computed(function(){
        if(self.importSuccess()){
            return "importSuccess";
        }
        if(self.importError()){
            return "importError";
        }


    });

    self.fullName = ko.computed(function(){
        var fullName = self.FirstName() + " " + self.LastName();
        if(typeof self.MiddleName() != "undefined"){
            fullName = self.FirstName() + " " + self.MiddleName() + " " + self.LastName();
        }
       return fullName
    });


/*****  NOT IMPORTED  **********************
 created-date
 total_submitted
 first_submitted
 effective_date (not consistently populated)
 policy_id


**************************/
};

function AppViewModel() {
    var self = this;
    self.importedData = ko.observableArray();

    self.fileSelected = ko.observable(false);
    self.processingStatus = ko.observable();
    self.matching = ko.observable(false);
    self.matchingError = ko.observable();
    self.importing = ko.observable(false);
    self.importAll = ko.observable(true);

    self.importAll = ko.computed({
        read: function () {
            var item = ko.utils.arrayFirst(self.importedData(), function (contact) {
                return !contact.importThis();
            });
            return item == null;
        },
        write: function (value) {
            ko.utils.arrayForEach(self.importedData(), function (contact) {
                contact.importThis(value);
            });
        }
    });

    self.importSelected = function(){

        self.importing(true);
        var dt = new Date();
        var importedCat = 18;
        var importTag = 0;
        var updatedCat = 22;
        var updateTag = 0;
        var timeStamp = dt.toLocaleDateString() + " " + dt.toLocaleTimeString();
        var processCount = 0;

        var contacts = ko.toJS(self.importedData);

        self.processingStatus("Processing record " + processCount + " of " + contacts.length + " records. " + $.percentage(processCount,contacts.length) + "% completed.");

        var importPacket = {
            service:"DataService.add",
            inputs:[
                "ContactGroup",
                {
                    GroupCategoryId:importedCat,
                    GroupDescription:"Auto created ("+ timeStamp + ")",
                    GroupName: timeStamp
                }
            ]
        };

        var updatePacket = {
            service:"DataService.add",
            inputs:[
                "ContactGroup",
                {
                    GroupCategoryId:updatedCat,
                    GroupDescription:"Auto created ("+ timeStamp + ")",
                    GroupName: timeStamp
                }
            ]
        };


        async.series([

            function(callback){
                self.methodCaller(importPacket, function(error, value){
                    if(error){
                        self.matchingError(err);
                        return;
                    }else{
                        importTag = value;
                    }
                    callback();
                })
            },

            function(callback){
                self.methodCaller(updatePacket, function(error, value){
                    if(error){
                        self.matchingError(err);
                        return;
                    }else{
                        updateTag = value;
                    }
                    callback();
                });
            }

        ], function(err) { //This function gets called after the two tasks have called their "task callbacks"
            if(err){
                self.matchingError(err);
            } else {
                console.log("importTag " + importTag);
                console.log("updateTag " + updateTag);

                async.forEachLimit(self.importedData(), 2, function(c, callback){

                    var id = c.Id();
                    var importThis = c.importThis();

                    var contact = {
                        FirstName:String(c.FirstName()),
                        LastName:String(c.LastName()),
                        MiddleName:String(c.MiddleName()),
                        State:String(c.State()),
                        Birthday:String(c.Birthday()),
                        _Carrier:String(c._Carrier()),
                        _PolicyNumber0:String(c._PolicyNumber0()),
                        _PolicyEffectiveDate:String(c._PolicyEffectiveDate()),
                        _FaceAmount0:c._FaceAmount0(),
                        _Plan:String(c._Plan()),
                        _ModePremium:c._ModePremium(),
                        _PlanType:String(c._PlanType()),
                        _Status:String(c._Status())
                    };

                    if(importThis){

                        var inputs = {};

                        if(id == 0){
                            //  Add Contact
                            inputs = {
                                service:"ContactService.add",
                                inputs:[
                                    contact
                                ]
                            };

                            self.methodCaller(inputs, function(error, value){

                                if(error){
                                    console.log("Error importing record");
                                    c.importError(true);
                                    c.errorMessage(error);
                                }else{

                                    self.methodCaller({service:"ContactService.addToGroup", inputs:[value,importTag]}, function(error, value){
                                        c.importSuccess(true);
                                    });

                                }

                                processCount++;
                                self.processingStatus("Processing record " + processCount + " of " + contacts.length + " records. " + $.percentage(processCount,contacts.length) + "% completed.");


                                callback();
                            });

                        } else {
                            // Update Contact
                            inputs = {
                                service:"ContactService.update",
                                inputs:[
                                    id,
                                    contact
                                ]
                            };

                            self.methodCaller(inputs, function(error, value){

                                if(error){
                                    console.log("Error importing record");
                                    c.importError(true);
                                    c.errorMessage(error);
                                }else{

                                    self.methodCaller({service:"ContactService.addToGroup", inputs:[id,updateTag]}, function(error, value){
                                        c.importSuccess(true);
                                    });

                                }

                                processCount++;
                                self.processingStatus("Processing record " + processCount + " of " + contacts.length + " records. " + $.percentage(processCount,contacts.length) + "% completed.");


                                callback();
                            });

                        }


                    }

                }, function(err){
                    self.matching(false);
                    if(err){
                        self.matchingError(err);
                    }
                });
            }

        });









    };


    self.methodCaller = function(data, callback){
        var client = xmlrpc.createSecureClient('https://' + "vb168" + '.infusionsoft.com/api/xmlrpc');

        var inputs = [
            "5f400bed0466dbbdb2d7dd474f58bb71b11631bb1332dff734dc92589162e44f"
        ].concat(data.inputs);

        client.methodCall( data.service, inputs, callback);

    };

    self.findMatches = function(contacts){

        var processCount = 0;

        self.processingStatus("Processing record " + processCount + " of " + contacts.length + " records. " + $.percentage(processCount,contacts.length) + "% completed.");
        async.forEachLimit(contacts, 2, function(contact, callback){

            var inputs = {
                service:"DataService.findByField",
                inputs:[
                    "Contact",
                    1,
                    0,
                    "_PolicyNumber0",
                    contact._PolicyNumber0(),
                    ["Id", "FirstName", "LastName", "State"]
                ]
            };

            self.methodCaller(inputs, function(error, value){

                if(!error && value.length > 0){
                    contact.Id(value[0].Id);
                    contact.importThis(true);
                    contact.matchedMethod("Policy Number");
                    processCount++;
                    self.processingStatus("Processing record " + processCount + " of " + contacts.length + " records. " + $.percentage(processCount,contacts.length) + "% completed.");

                } else {

                    var inputs = {
                        service:"DataService.query",
                        inputs:[
                            "Contact",
                            1,
                            0,
                            {FirstName:contact.FirstName(), LastName:contact.LastName()},
                            ["Id", "FirstName", "LastName", "State"]
                        ]
                    };

                    self.methodCaller(inputs, function(error, value){
                        if(error){
                            console.log("Error finding by Name");
                            contact.importError(true);
                            contact.errorMessage(error);
                        }else{
                            if(value.length > 0){
                                contact.matchedMethod("Name");
                                contact.Id(value[0].Id);
                            } else {
                                contact.matchedMethod("No Match (Adding)");
                            }
                            contact.importThis(true);
                            processCount++;
                            self.processingStatus("Processing record " + processCount + " of " + contacts.length + " records. " + $.percentage(processCount,contacts.length) + "% completed.");
                        }
                    });
                }

                callback();
            });


        }, function(err){
            self.matching(false);
            if(err){
                self.matchingError(err);
            }
        });

    };

    $("#FileUpload").on('change', function (evt) {

        self.fileSelected(true);

        var data = null;
        var file = evt.target.files[0];
        var reader = new FileReader();
        reader.readAsText(file);
        reader.onload = function(e) {

            var parsed = $.parse(e.target.result);
            var fields = parsed.results.fields;
            var rows = parsed.results.rows;

            var mapped = $.map(rows, function(item){
                var nameParts = human.parseName(item.clients);

                var contact = new Contact();
                contact.FirstName(nameParts.firstName);
                contact.LastName(nameParts.lastName);
                if(nameParts.middleName){
                    contact.MiddleName(nameParts.middleName);
                }

                contact.Id(0);
                contact.State(item.state);
                contact.Birthday(item.client_birth_date_one);
                contact._Carrier(item.carrier);
                contact._PolicyNumber0(item.policy);
                contact._PolicyEffectiveDate(item.placed_date);
                contact._FaceAmount0(item.face_amount);
                contact._Plan(item.product);
                contact._ModePremium(item.modal_premium);
                contact._PlanType(item.product_type);
                contact._Status(item.status);

                return contact;

            });
            self.matching(true);
            self.findMatches(mapped);
            self.importedData(mapped);
        };
        reader.onerror = function() {
            alert('Unable to read ' + file.fileName);
        };

    });



}
