/**
 * Created by dmccarthy on 14/11/2013.
 */


'use strict';

var dataApi = require('./main.js')

var params = {
   'dao_in_q'   : {spec:'tcp://127.0.0.1:49994'},
   'mong_in_q'  : {spec:'tcp://127.0.0.1:49996', id:'data_api_conn'},
   'dao_out_q'  : {spec:'tcp://127.0.0.1:49995', id:'dao'},
   'mong_out_q' : {spec:'tcp://127.0.0.1:49997', id:'test'}
}


dataApi(params)