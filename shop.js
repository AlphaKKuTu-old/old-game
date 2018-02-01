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
 * kkutu-lib 모듈에 호환되도록 수정
 */

const DB = require('./db')
const File = require('fs')
const lib = require('kkutu-lib')
const JLog = lib.jjlog

/* 상품 group 명세
NIK 이름 스킨; 이름의 색상을 변경합니다.
*/
JLog.info('KKuTu Goods Manager')
DB.ready = function () {
  let data = {
    type: process.argv[2],
    url: process.argv[3]
  }

  File.readFile(data.url, function (err, _file) {
    if (err) {
      JLog.error('URL not found: ' + data.url)
      process.exit()
    } else {
      let dv = _file.toString()

      dv = JSON.parse(dv)

      data.list = dv.list
      run(data)
    }
  })
  JLog.success('DB is ready.')
}
function run (data) {
  let o

  switch (data.type) {
    case 'A':
      /* 추가/수정
{
  "id": _id,
  "group":카테고리,
  "title":제목,
  "cost": 가격,
  "term": 기간 (0이면 무한),
  "desc": 설명
}
   */
      for (let i in data.list) {
        o = data.list[i]

        JLog.log(i)
        DB.kkutu_shop.upsert([ '_id', Number(o.id) ]).set(
          [ 'group', o.group ],
          [ 'title', o.title ],
          [ 'cost', Number(o.cost) ],
          [ 'term', Number(o.term) ],
          [ 'desc', o.desc ],
          [ 'updatedAt', new Date() ]
        ).soi(
          [ 'hit', 0 ]
        ).on()
      }
      break
    default:
      JLog.error('Unhandled type ' + data.type)
      JLog.log('Avails: A')
      process.exit()
  }
}
