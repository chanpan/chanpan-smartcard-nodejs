const smartcard = require("smartcard");
const Devices = smartcard.Devices;
const devices = new Devices();
const CommandApdu = smartcard.CommandApdu;
const legacy = require("legacy-encoding");
var output = {};
const fs = require('fs');
const mysql      = require('mysql');


devices.on("device-activated", event => {
  const currentDevices = event.devices;
  let device = event.device;
  console.info(`Device '${device}' activated, devices: ${currentDevices}`);

  event.device.on("card-inserted", event => {
    console.info("Insert Card");
    let card = event.card;
    card.issueCommand(new CommandApdu({bytes: [0x00,0xa4,0x04,0x00,0x08,0xa0,0x00,0x00,0x00,0x54,0x48,0x00,0x01]}))
    .then(results => {
          readCardData(card);      
    }).catch(error => {
        console.error(error);
    });
  });
})

devices.on('error', function (err) {
  console.log(err);
});


function readCardData(card){
  console.log('read-card-data');
  getPersonCid(card).then(cid=>{
      getPersonData(card).then(data=>{
          getPersonAddress(card).then(address=>{
            output={
                  cid:cid,
                  titleTh: data.titleTh,
                  titleEn: data.titleEn,
                  fnameTh: data.fnameTh,
                  lnameTh: data.lnameTh,
                  fnameEn: data.fnameEn,
                  lnameEn: data.lnameEn,
                  birthday: data.birthday,
                  sex: data.sex,
                  add1:address.add1,
                  add2:address.add2,
                  add3:address.add3,
                  add4:address.add4,
                  add5:address.add5,
                  age:data.age,  
              }
              saveData();  
          });
      });
  });
  
}

function getPersonCid(card){
  return new Promise((resolve,reject)=>{
      card.issueCommand(new CommandApdu({ bytes: [0x80, 0xb0, 0x00, 0x04, 0x02, 0x00, 0x0d] }))
      .then(response => {                  
            card.issueCommand(new CommandApdu({ bytes: [0x00, 0xc0, 0x00, 0x00, 0x0d] })).then(cid => {
              cid = JSON.stringify(cid.toString().substring(0,13));
              resolve(cid)
            }).catch(error =>console.error(error));
      }).catch(error => {
              reject(error);
      });
  });
}
function getPersonData(card){
  return new Promise((resolve,reject)=>{
      card.issueCommand(new CommandApdu({ bytes: [0x80, 0xb0, 0x00, 0x11, 0x02, 0x00, 0xd1] }))
      .then(response => {                  
            card.issueCommand(new CommandApdu({ bytes: [0x00, 0xc0, 0x00, 0x00, 0xd1] })).then(name => {
              name = legacy.decode(name, "tis620");              
              name= name.split("#");
              name[3] = name[3].split("                                                                                ");
              name[6] = name[6].split("                                                                             ");
 
              let birthday = `${name[6][1].trim().substring(0,4)-543}-${name[6][1].trim().substring(4,6)}-${name[6][1].trim().substring(6,8)}`;
              var d = new Date();
              var n = d.getFullYear();

              let age = n-(name[6][1].trim().substring(0,4)-543);
              let sex =  name[6][1].substring(8,9);
              var objData = {age:age,titleTh:name[0],titleEn:name[3][1], fnameTh:name[1], lnameTh:name[3][0], fnameEn:name[4], lnameEn:name[6][0], birthday:birthday, sex:sex};
              resolve(objData);
            }).catch(error =>console.error(error));
      }).catch(error => {
              reject(error);
      });
  });
}

function getPersonAddress(card){
  return new Promise((resolve,reject)=>{
    card.issueCommand(new CommandApdu({ bytes: [0x80, 0xb0, 0x15, 0x79, 0x02, 0x00, 0x64] }))
    .then(response => {
        card.issueCommand(new CommandApdu({ bytes: [0x00, 0xc0, 0x00, 0x00, 0x64] }))
          .then(response => {
            let address = legacy.decode(response, "tis620");
            address = address.replace("#", " ");
            address = address.replace("####", " ");
            address = address.replace("#", " ");
            address = address.replace("#", " ");
            address = address.split(" ");
            objAddress = {};
            objAddress['add1'] = address[0].trim(); //บ้านเลขที่
            objAddress['add2'] = address[2].trim();//หมู่ที่
            objAddress['add3'] = address[3].trim().substring(4, address[3].trim().length);//ตำบล
            objAddress['add4'] = address[4].trim().substring(5, address[4].trim().length);//อำเภอ
            objAddress['add5'] = address[5].trim().substring(7, address[5].trim().length);//จังหวัด
            resolve(objAddress);
          }).catch(error => console.error(error));
      }).catch(error =>console.error(error));
  });
}

function saveData(){
   
  
}