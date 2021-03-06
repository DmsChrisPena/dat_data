import { Groups, Realtor, Relocation, Person } from '/lib/collections';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import _ from 'lodash';

export default function() {
    Meteor.methods({
        'person.map.model'() {

            const { userId } = this;

            // Define collections and fetch
            const groups = Groups.find({userId}).fetch();
            const realtor = Realtor.find({userId}).fetch();
            const relocation = Relocation.find({userId}).fetch();

            //  Define function to rename any keys
            const renameObjectKey = (obj, oldKey, newKey) => {
             Object.defineProperty(obj, newKey,
                 Object.getOwnPropertyDescriptor(obj, oldKey));
             delete obj[oldKey];
             return obj;
            }

            // Get all phone numbers from relocation and put them into an array
            let relocationPhoneNumbers = _.reduce(relocation, function(result, value, key) {
                result.push(relocation[key].phoneNumber);
                return result;
            }, []);

            // Get all client cell numbers from realtor and put them into an array
            let realtorClientCell = _.reduce(realtor, function(result, value, key) {
                result.push(realtor[key].clentCell);
                return result;
            }, []);

            // Get all work numbers from realtor and put them into an array
            let realtorWorkPhone = _.reduce(realtor, function(result, value, key) {
                result.push(realtor[key].workPhone);
                return result;
            }, []);

            // Find all people matched in relocation/realtor in realtor collection
            let matchedRealtor = Realtor.find({ $or:  
                [{ workPhone: { $in: relocationPhoneNumbers } },
                 { clentCell: { $in: relocationPhoneNumbers } }
                ]}).fetch();

            // Find all people matched in relocation/realtor in relocation collection
            let matchedRelocation = Relocation.find({ $or:  
                [{ phoneNumber: { $in: realtorClientCell } },
                 { phoneNumber: { $in: realtorWorkPhone } }
                ]}).fetch();

            // Find all realtors not in relocation collection
            let notMatchedRealtor = Realtor.find({ $and:  
                [{ workPhone: { $nin: relocationPhoneNumbers } },
                 { clentCell: { $nin: relocationPhoneNumbers } }
                ]}).fetch();

            // Find all relocations not in realtor collection
            let notMatchedRelocation = Relocation.find({ $and: 
                [{phoneNumber: { $nin: realtorClientCell } },
                 {phoneNumber: { $nin: realtorWorkPhone } }
                 ]}).fetch();

            
            // Combine matched realtor and relocation object, rename _id, add userId, type and insert
            _(matchedRealtor).forEach((matchedRealtor, key) => {

                matchedRealtor = renameObjectKey(matchedRealtor, "_id", "realtorId");
                matchedRelocation[key] = renameObjectKey(matchedRelocation[key], "_id", "relocationId");

                let matchedRealtorRelocation = Object.assign(matchedRealtor, matchedRelocation[key]);
                
                matchedRealtorRelocation.userId = userId;
                matchedRealtorRelocation.type = "matchedRealtorRelocation";

                Person.insert(matchedRealtorRelocation);
            });

            //Add userid, rename _id, add type, and then insert to person collection
            _(groups).forEach((_group) => {
                _group.userId = userId;
                _group = renameObjectKey(_group, "_id", "groupId");
                _group.type = "group";
                Person.insert(_group);
            });

            //Add userid, rename _id, add type, and then insert to person collection
            _(notMatchedRealtor).forEach((_realtor) => {
                _realtor.userId = userId;
                _realtor = renameObjectKey(_realtor, "_id", "realtorId");
                _realtor.type = "notMatchedRealtor";
                Person.insert(_realtor);
            });

            //Add userid, rename _id, add type, and then insert to person collection
            _(notMatchedRelocation).forEach((_relocation) => {
                _relocation.userId = userId;
                _relocation = renameObjectKey(_relocation, "_id", "relocationId");
                _relocation.type = "notMatchedRelocation";
                Person.insert(_relocation);
            });
        }
    });
}