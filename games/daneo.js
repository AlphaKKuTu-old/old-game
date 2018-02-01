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

const Const = require('../const')
const lib = require('kkutu-lib')
const Lizard = lib.lizard
let DB
let DIC

const ROBOT_START_DELAY = [ 1200, 800, 400, 200, 0 ]
const ROBOT_TYPE_COEF = [ 1250, 750, 500, 250, 0 ]
const ROBOT_THINK_COEF = [ 4, 2, 1, 0, 0 ]
const ROBOT_HIT_LIMIT = [ 4, 2, 1, 0, 0 ]

exports.init = function (_DB, _DIC) {
  DB = _DB
  DIC = _DIC
}
exports.getTitle = function () {
  const R = new Lizard.Tail()
  const my = this

  setTimeout(function () {
    R.go('①②③④⑤⑥⑦⑧⑨⑩')
  }, 500)
  return R
}
exports.roundReady = function () {
  const my = this
  let ijl = my.opts.injpick.length

  clearTimeout(my.game.turnTimer)
  my.game.round++
  my.game.roundTime = my.time * 1000
  if (my.game.round <= my.round) {
    my.game.theme = my.opts.injpick[Math.floor(Math.random() * ijl)]
    my.game.chain = []
    if (my.opts.mission) my.game.mission = getMission(my.rule.lang)
    my.byMaster('roundReady', {
      round: my.game.round,
      theme: my.game.theme,
      mission: my.game.mission
    }, true)
    my.game.turnTimer = setTimeout(my.turnStart, 2400)
  } else {
    my.roundEnd()
  }
}
exports.turnStart = function (force) {
  const my = this
  let speed
  let si

  if (!my.game.chain) return
  my.game.roundTime = Math.min(my.game.roundTime, Math.max(10000, 150000 - my.game.chain.length * 1500))
  speed = my.getTurnSpeed(my.game.roundTime)
  clearTimeout(my.game.turnTimer)
  clearTimeout(my.game.robotTimer)
  my.game.late = false
  my.game.turnTime = 15000 - 1400 * speed
  my.game.turnAt = (new Date()).getTime()
  my.byMaster('turnStart', {
    turn: my.game.turn,
    speed: speed,
    roundTime: my.game.roundTime,
    turnTime: my.game.turnTime,
    mission: my.game.mission,
    seq: force ? my.game.seq : undefined
  }, true)
  my.game.turnTimer = setTimeout(my.turnEnd, Math.min(my.game.roundTime, my.game.turnTime + 100))
  if (si = my.game.seq[my.game.turn]) {
    if (si.robot) {
      my.readyRobot(si)
    }
  }
}
exports.turnEnd = function () {
  const my = this
  let target = DIC[my.game.seq[my.game.turn]] || my.game.seq[my.game.turn]
  let score

  if (my.game.loading) {
    my.game.turnTimer = setTimeout(my.turnEnd, 100)
    return
  }
  if (!my.game.chain) return

  my.game.late = true
  if (target) {
    if (target.game) {
      score = Const.getPenalty(my.game.chain, target.game.score)
      target.game.score += score
    }
  }
  getAuto.call(my, my.game.theme, 0).then(function (w) {
    my.byMaster('turnEnd', {
      ok: false,
      target: target ? target.id : null,
      score: score,
      hint: w
    }, true)
    my.game._rrt = setTimeout(my.roundReady, 3000)
  })
  clearTimeout(my.game.robotTimer)
}
exports.submit = function (client, text, data) {
  let score, l, t
  const my = this
  let tv = (new Date()).getTime()
  let mgt = my.game.seq[my.game.turn]

  if (!mgt) return
  if (!mgt.robot) if (mgt != client.id) return
  if (!my.game.theme) return
  if (my.game.chain.indexOf(text) == -1) {
    l = my.rule.lang
    my.game.loading = true
    function onDB ($doc) {
      function preApproved () {
        if (my.game.late) return
        if (!my.game.chain) return

        my.game.loading = false
        my.game.late = true
        clearTimeout(my.game.turnTimer)
        t = tv - my.game.turnAt
        score = my.getScore(text, t)
        my.game.chain.push(text)
        my.game.roundTime -= t
        client.game.score += score
        client.publish('turnEnd', {
          ok: true,
          value: text,
          mean: $doc.mean,
          theme: $doc.theme,
          wc: $doc.type,
          score: score,
          bonus: (my.game.mission === true) ? score - my.getScore(text, t, true) : 0,
          baby: $doc.baby
        }, true)
        if (my.game.mission === true) {
          my.game.mission = getMission(my.rule.lang)
        }
        setTimeout(my.turnNext, my.game.turnTime / 6)
        if (!client.robot) {
          client.invokeWordPiece(text, 1)
          DB.kkutu[l].update([ '_id', text ]).set([ 'hit', $doc.hit + 1 ]).on()
        }
      }
      function denied (code) {
        my.game.loading = false
        client.publish('turnError', { code: code || 404, value: text }, true)
      }
      if ($doc) {
        if ($doc.theme.match(toRegex(my.game.theme)) == null) denied(407)
        else preApproved()
      } else {
        denied()
      }
    }
    DB.kkutu[l].findOne([ '_id', text ]).on(onDB)
  } else {
    client.publish('turnError', { code: 409, value: text }, true)
  }
}
exports.getScore = function (text, delay, ignoreMission) {
  const my = this
  let tr = 1 - delay / my.game.turnTime
  let score = Const.getPreScore(text, my.game.chain, tr)
  let arr

  if (!ignoreMission) {
    if (arr = text.match(new RegExp(my.game.mission, 'g'))) {
      score += score * 0.5 * arr.length
      my.game.mission = true
    }
  }
  return Math.round(score)
}
exports.readyRobot = function (robot) {
  const my = this
  let level = robot.level
  let delay = ROBOT_START_DELAY[level]
  let w, text

  getAuto.call(my, my.game.theme, 2).then(function (list) {
    if (list.length) {
      list.sort(function (a, b) { return b.hit - a.hit })
      if (ROBOT_HIT_LIMIT[level] > list[0].hit) denied()
      else pickList(list)
    } else denied()
  })
  function denied () {
    text = '... T.T'
    after()
  }
  function pickList (list) {
    if (list) {
      do {
        if (!(w = list.shift())) break
      } while (false)
 }
    if (w) {
      text = w._id
      delay += 500 * ROBOT_THINK_COEF[level] * Math.random() / Math.log(1.1 + w.hit)
      after()
    } else denied()
  }
  function after () {
    delay += text.length * ROBOT_TYPE_COEF[level]
    setTimeout(my.turnRobot, delay, robot, text)
  }
}
function toRegex (theme) {
  return new RegExp(`(^|,)${theme}($|,)`)
}
function getMission (l) {
  let arr = (l == 'ko') ? Const.MISSION_ko : Const.MISSION_en

  if (!arr) return '-'
  return arr[Math.floor(Math.random() * arr.length)]
}
function getAuto (theme, type) {
  /* type
		0 무작위 단어 하나
		1 존재 여부
		2 단어 목록
	*/
  const my = this
  const R = new Lizard.Tail()
  let bool = type == 1

  let aqs = [[ 'theme', toRegex(theme) ]]
  let aft
  let raiser
  let lst = false

  if (my.game.chain) aqs.push([ '_id', { '$nin': my.game.chain } ])
  raiser = DB.kkutu[my.rule.lang].find.apply(this, aqs).limit(bool ? 1 : 123)
  switch (type) {
    case 0:
    default:
      aft = function ($md) {
        R.go($md[Math.floor(Math.random() * $md.length)])
      }
      break
    case 1:
      aft = function ($md) {
        R.go(!!$md.length)
      }
      break
    case 2:
      aft = function ($md) {
        R.go($md)
      }
      break
  }
  raiser.on(aft)

  return R
}
