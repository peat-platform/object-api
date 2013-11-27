/**
 * Created by dmccarthy on 14/11/2013.
 */


'use strict';

var dataApi = require('./main.js')

var params = {
   dao_sub_q           : {spec:'tcp://127.0.0.1:49994'                                 },
   mongrel_sub_q       : {spec:'tcp://127.0.0.1:49996', id:'mongrel_sub_q_data_1'      },
   data_api_sub_q      : {spec:'tcp://127.0.0.1:49995', id:'data_api_sub_q_data_1'     },
   data_api_mong_sub_q : {spec:'tcp://127.0.0.1:49997', id:'data_api_mong_sub_q_data_1'},
   logger_params : {
      'path'     : '/opt/openi/cloudlet_platform/logs/data_api',
      'log_level': 'debug',
      'as_json'  : false
   }
}


dataApi(params)