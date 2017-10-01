/**
 * Rule the words! KKuTu Online
 * Copyright (C) 2017 JJoriping(op@jjo.kr)
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

  
/**
 * 볕뉘 수정사항:
 * var 에서 let/const 로 변수 변경
 * Worker 생성 관련 변경
 * ServerID 관련 변경
 * kkutu-lib 모듈에 호환되도록 수정
 */

const Cluster = require("cluster");
const Const = require('./const');
//볕뉘 수정
const lib = require('kkutu-lib');
const global = require('./global.json')
const JLog = lib.jjlog;
const SID = Number(process.argv[2] || 0);
const CPU = Number(process.argv[3] || global.CLUSTER_SLAVES || 4); //require("os").cpus().length;
//볕뉘 수정

if(isNaN(SID)){
	if(process.argv[2] == "test"){
		global.test = true;
		CPU = 1;
	}else{
		console.log(`Invalid Server ID ${process.argv[2]}`);
		process.exit(1);
	}
}
if(isNaN(CPU)){
	console.log(`Invalid CPU Number ${process.argv[3]}`);
	process.exit(1);
}
if(Cluster.isMaster){
	let channels = {}, chan;
	let i;
	
	for(let i=0; i<CPU; i++){
		chan = i + 1;
		channels[chan] = Cluster.fork({ SERVER_NO_FORK: true, KKUTU_PORT: Const.MAIN_PORTS[SID] + 416 + i, CHANNEL: chan });
	}
	Cluster.on('exit', function(w){
		for(let i in channels){
			if(channels[i] == w){
				chan = Number(i);
				break;
			}
		}
		JLog.error(`Worker @${chan} ${w.process.pid} died`);
		channels[chan] = Cluster.fork({ SERVER_NO_FORK: true, KKUTU_PORT: Const.MAIN_PORTS[SID] + 416 + (chan - 1), CHANNEL: chan });
	});
	process.env['KKUTU_PORT'] = Const.MAIN_PORTS[SID];
	require("./master.js").init(SID.toString(), channels);
}else{
	require("./slave.js");
}