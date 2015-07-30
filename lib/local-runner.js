/**
 * Created by dmccarthy on 14/11/2013.
 */


'use strict';

var dataApi = require('./main.js');

var config = {
   dao_sink        : { spec:'tcp://127.0.0.1:49999', bind:false, type:'push', id:'d' },
   mongrel_handler : {
      source : { spec:'tcp://127.0.0.1:49903', id:'e', bind:false, type:'pull', isMongrel2:true, error_handle:'tcp://127.0.0.1:49904' },
      sink   : { spec:'tcp://127.0.0.1:49904', id:'f', bind:false, type:'pub',  isMongrel2:true }
   },
   logger_params : {
      'path'     : '/opt/peat/cloudlet_platform/logs/object_api',
      'log_level': 'debug',
      'as_json'  : true
   },
   trusted_security_framework_public_key: '-----BEGIN PUBLIC KEY-----\n'+
         'MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAKT8kGk6ZNo3sC4IIo29leRLVD23T2r0\n'+
         'vWXBEkk2pV42HsxKAmPs789AGHH9XwbGpD7FvrcBWWgb65v32Hg/NGkCAwEAAQ==\n'+
      '-----END PUBLIC KEY-----',
   monitoring : { 
      object : { 
         get  : ['id_only','resolve'],
         post : [],
         put  : [],
         delete : [] 
      }
   }
};


dataApi(config);