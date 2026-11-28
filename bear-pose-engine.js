/* bear-pose-engine.js
   createBearfriendHomeEngine(svg): the Bearfriend home pose engine. Named differently from app.js's createBearPoseEngine so the two never clash.
   Returns { play(action, by), setSound(bool), destroy() }.
   Actions: hug, kiss, flykiss, slap, hands, feed, sleep, dance, pet, tummy, idle (+ peekaboo, bump). */

function createBearfriendHomeEngine(svg) {
    "use strict";
    const $B = id => svg.querySelector('#' + id);
    const R = Math.PI / 180, G = 318, CX = [200, 400], S = [1, -1], L1 = 24, L2 = 20, NAME = ["Brown Bear", "White Bear"];
    const COL = [{
            fur: "#9b6a47", st: "#6e4529", bel: "#c99a74", muz: "#e9cfb3", ear: "#d79a86", bow: "#8d7bd0"
        }, {
            fur: "#fffaf3", st: "#dcc5b4", bel: "#fffdf9", muz: "#f6e6dc", ear: "#f7c3d1", bow: "#ef8fb1"
        }];
    const ACTS = [
        ["hug", "🤗", "Hug"], ["kiss", "💋", "Kiss"], ["flykiss", "😘", "Flying Kiss"], ["slap", "🖐️", "Playful Slap"], ["hands", "🫶", "Hold Hands"], ["feed", "🍓", "Feed"], ["sleep", "💤", "Sleep"], ["dance", "💃", "Dance"], ["pet", "🐾", "Pet"], ["tummy", "🫳", "Scratch Tummy"], ["idle", "🌸", "Relax"]
    ];
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const bearSoundStorageKey = "bf-home-sound";
    let active = true, rafId = 0, snd = true;
    try {
        snd = localStorage.getItem(bearSoundStorageKey) !== "off";
    }
    catch { }

    function bear(i) {
        const c = COL[i], st = `stroke="${c.st}" stroke-width="2.6"`;
        const arm = n => `<path id="${n}${i}o" fill="none" stroke="${c.st}" stroke-width="24.5" stroke-linecap="round" stroke-linejoin="round"/><circle id="${n}${i}co" r="14.2" fill="${c.st}"/><path id="${n}${i}f" fill="none" stroke="${c.fur}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/><g id="${n}${i}p"><circle r="12" fill="${c.fur}"/><ellipse cx="-3.5" cy="-3.5" rx="4.5" ry="3" fill="#fff" opacity=".25"/></g>`;
        const eye = k => `<g id="e${i}${k}"><ellipse id="ee${i}${k}" rx="4.4" ry="5.4" fill="#3d2f2d"/><circle cx="1.4" cy="-1.8" r="1.9" fill="#fff"/><circle cx="-1.9" cy="2.1" r=".9" fill="#fff" opacity=".75"/><path id="ea${i}${k}" fill="none" stroke="#3d2f2d" stroke-width="2.4" stroke-linecap="round" opacity="0"/></g>`;
        return `<ellipse id="sh${i}" cy="${G + 8}" rx="48" ry="8" fill="#9a6a86" opacity=".16"/>
<g id="s${i}"><g id="p${i}"><g id="bd${i}">
<g id="lg${i}l"><ellipse cx="-22" cy="-13" rx="19" ry="14" fill="${c.fur}" ${st}/><ellipse cx="-22" cy="-10" rx="9.5" ry="6.5" fill="${c.ear}" opacity=".85"/></g>
<g id="lg${i}r"><ellipse cx="22" cy="-13" rx="19" ry="14" fill="${c.fur}" ${st}/><ellipse cx="22" cy="-10" rx="9.5" ry="6.5" fill="${c.ear}" opacity=".85"/></g>
<ellipse cy="-50" rx="38" ry="40" fill="${c.fur}" ${st}/><ellipse cy="-46" rx="24" ry="28" fill="${c.bel}"/></g>
<g id="a${i}">${arm("o" + 0)}${arm("i" + 0)}</g>
<g id="h${i}"><g id="er${i}l"><circle cx="-43" cy="-76" r="15" fill="${c.fur}" ${st}/><circle cx="-43" cy="-76" r="8" fill="${c.ear}"/></g><g id="er${i}r"><circle cx="43" cy="-76" r="15" fill="${c.fur}" ${st}/><circle cx="43" cy="-76" r="8" fill="${c.ear}"/></g>
<ellipse cy="-38" rx="58" ry="48" fill="${c.fur}" ${st}/>
${i ? `<g transform="translate(40 -88) rotate(20)"><path d="M0 0L-13-8 -13 8Z M0 0L13-8 13 8Z" fill="${c.bow}" stroke="#d3688f" stroke-width="1.5" stroke-linejoin="round"/><circle r="4" fill="#f9b6cd"/></g>` : ""}
<ellipse id="bl${i}l" cx="-39" cy="-27" rx="10" ry="6" fill="#ff8fb0" opacity=".5"/><ellipse id="bl${i}r" cx="39" cy="-27" rx="10" ry="6" fill="#ff8fb0" opacity=".5"/>
<ellipse cy="-26" rx="15" ry="10.5" fill="${c.muz}"/><ellipse cy="-30" rx="5" ry="3.4" fill="#4a3433"/><circle cx="-1.3" cy="-31" r="1" fill="#fff" opacity=".7"/>
<path id="mo${i}" transform="translate(0 -22)" fill="#b2606d" stroke="#4a3433" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
${eye("l")}${eye("r")}</g></g></g>`;
    }
    svg.innerHTML = `<defs><radialGradient id="gl" cx=".5" cy=".4"><stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
<ellipse cx="300" cy="150" rx="280" ry="150" fill="url(#gl)"/>
<path d="M0 270Q110 215 230 262T440 250T600 240V380H0Z" fill="#f6d6e4" opacity=".75"/><path d="M0 300Q140 255 300 290T600 280V380H0Z" fill="#eadcf7" opacity=".8"/>
<g fill="#fff" opacity=".7"><ellipse cx="150" cy="160" rx="38" ry="12"/><ellipse cx="176" cy="152" rx="24" ry="12"/><ellipse cx="450" cy="172" rx="42" ry="12"/><ellipse cx="478" cy="163" rx="24" ry="11"/></g>
<ellipse cx="300" cy="${G + 10}" rx="280" ry="36" fill="#fdeedd" stroke="#e9c6da" stroke-width="3" stroke-dasharray="3 9" stroke-linecap="round"/>
<ellipse id="pil" cx="300" cy="${G - 14}" rx="112" ry="22" fill="#f7d3e2" stroke="#e5b2c9" stroke-width="2.5" opacity="0"/>
<g id="bears">${bear(0)}${bear(1)}<g id="tummyBackArm" opacity="0" pointer-events="none"><path id="tummyBackArmOutline" fill="none" stroke="#6e4529" stroke-width="27" stroke-linecap="round" stroke-linejoin="round"/><path id="tummyBackArmFill" fill="none" stroke="#9b6a47" stroke-width="21" stroke-linecap="round" stroke-linejoin="round"/><g id="tummyBackPaw"><circle r="12.5" fill="#9b6a47" stroke="#6e4529" stroke-width="2.2"/><ellipse cx="-7" cy="-8" rx="4" ry="3.2" fill="#9b6a47" stroke="#6e4529" stroke-width="1.3"/><ellipse cx="0" cy="-10" rx="4" ry="3.2" fill="#9b6a47" stroke="#6e4529" stroke-width="1.3"/><ellipse cx="7" cy="-8" rx="4" ry="3.2" fill="#9b6a47" stroke="#6e4529" stroke-width="1.3"/><path d="M-4 2Q0 5 4 2" fill="none" stroke="#d7a58a" stroke-width="1.4" stroke-linecap="round"/></g></g></g><g font-family="Nunito,Segoe UI,sans-serif" font-size="10" font-weight="800" fill="#8b6a7e" text-anchor="middle"></g>
<rect id="blk" x="0" y="0" width="600" height="400" fill="#5b4a9a" fill-opacity=".24" opacity="0" pointer-events="none"/>
<g id="berry" opacity="0"><path d="M0 -10C-12 -11 -14 3 -8 11 -4 17 4 17 8 11 14 3 12 -11 0 -10Z" fill="#f0455f"/><g fill="#ffe7a8"><circle cx="-4" cy="0" r="1.2"/><circle cx="4" cy="-2" r="1.2"/><circle cx="0" cy="6" r="1.2"/><circle cx="5" cy="7" r="1.2"/><circle cx="-6" cy="8" r="1.2"/></g><path d="M0-10L-7-14 -3-9 0-15 3-9 7-14Z" fill="#6fbf73"/></g>
<g id="fx"></g>`;
    const K = ["x", "y", "rot", "hr", "hx", "hy", "eye", "eh", "mouth", "pk", "blush", "i1", "i2", "o1", "o2", "sq", "ear"];
    const P = [0, 1].map(() => ({
        x: 0, y: 0, rot: 0, hr: 0, hx: 0, hy: 0, eye: 1, eh: 1, mouth: 0, pk: 0, blush: .3, i1: -12, i2: -6, o1: 12, o2: 6, sq: 0, ear: 0
    }));
    const ptL = (b, lx, ly) => {
        const p = P[b], r = p.rot * R, vy = ly + 50;
        return [CX[b] + S[b] * (p.x + lx * Math.cos(r) - vy * Math.sin(r)), G + p.y + lx * Math.sin(r) + vy * Math.cos(r) - 50];
    };
    const ptH = (b, hx, hy) => {
        const p = P[b], r = p.hr * R;
        return ptL(b, p.hx + hx * Math.cos(r) - hy * Math.sin(r), -70 + p.hy + hx * Math.sin(r) + hy * Math.cos(r));
    };
    const toL = (b, wx, wy) => {
        const p = P[b], r = p.rot * R, x1 = S[b] * (wx - CX[b]) - p.x, y1 = wy - G - p.y + 50;
        return [x1 * Math.cos(r) + y1 * Math.sin(r), -x1 * Math.sin(r) + y1 * Math.cos(r) - 50];
    };

    function ik(tx, ty) {
        const sx = 28, sy = -76;
        let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy);
        const m = L1 + L2 - .5;
        if (d > m) {
            dx *= m / d;
            dy *= m / d;
            d = m;
        }
        d = Math.max(d, 10);
        const tb = Math.atan2(-dx, dy), al = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
        let best;
        for (const g of [1, -1]) {
            const a = tb + g * al, ex = sx - L1 * Math.sin(a), ey = sy + L1 * Math.cos(a);
            if (!best || ey > best.ey)
                best = { a, ex, ey };
        }
        const tt = Math.atan2(-(sx + dx - best.ex), sy + dy - best.ey);
        let a2 = (tt - best.a) / R;
        a2 = ((a2 + 540) % 360) - 180;
        return [best.a / R, a2];
    }
    const fk = (s, a1, a2) => {
        const t1 = a1 * R, t2 = (a1 + a2) * R, ex = s - L1 * Math.sin(t1), ey = -76 + L1 * Math.cos(t1);
        return [
            [s, -76], [ex, ey], [ex - L2 * Math.sin(t2), ey + L2 * Math.cos(t2)], t2 / R
        ];
    };
    const V = [{}, {}], EXP = {
        eye: 1, eh: 1, mouth: 1, pk: 1, blush: 1
    };
    let tummyLvl = 1, tummyAt = 0, cur = "idle", actor = 0, t0 = performance.now(), sleepF = 0, berryS = 1, rate = 7;
    const idle = (b, t) => {
        const w = Math.sin(t * 1.2 + b * 1.7), curious = Math.max(0, Math.sin(t * .19 + b * 2.4)), stretch = Math.max(0, Math.sin(t * .075 + b * 3.1));
        return {
            x: Math.sin(t * .32 + b * 1.8) * 1.4, y: -stretch * 1.2, rot: w * 1.35 + curious * (b ? -.8 : .8), hr: Math.sin(t * .8 + b * 2.3) * 3.2 + 2 + curious * (b ? -2.2 : 2.2), hx: 0, hy: 0, eye: 1, eh: 1, mouth: 0, pk: 0, blush: .3, i1: -12 + w * 2 - stretch * 3, i2: -6, o1: 12 - w * 2 + stretch * 3, o2: 6, sq: 0, ear: Math.pow(Math.max(0, Math.sin(t * .9 + b * 2.6)), 9) * 7
        };
    };
    const BITES = [1.4, 2.8, 4.0];
    const ACT = {
        idle: () => ({}),
        flykiss: (t, b) => {
            const other = 1 - actor, phase = t < .72 ? 0 : t < 1.42 ? 1 : 2, flutter = Math.sin(t * 8);
            if (b === actor) {
                const mouth = ptH(actor, 0, -28), target = ptH(other, 0, -34), point = phase === 0 ? mouth : target;
                return {
                    x: 58 + Math.sin(t * 2) * 1.2, rot: 2, hr: phase === 0 ? 8 : phase === 1 ? 19 : 5, hx: phase === 1 ? 12 : 0, eye: 1, mouth: .25, blush: .82, ik: phase < 2 ? [point[0], point[1] + (phase === 1 ? flutter * 1.6 : 0)] : null, i1: -28, i2: -12, o1: phase === 1 ? 30 : 18, o2: phase === 1 ? 20 : 10
                };
            }
            return {
                x: 58, y: Math.abs(flutter) * .8, rot: Math.sin(t * 5) * .8, hr: t > 1.05 ? -5 : 0, eye: t > 1.05 ? .12 : 1, mouth: .48, blush: .98, i1: -24, i2: -10, o1: 24, o2: 10
            };
        },
        slap: (t, b) => {
            const other = 1 - actor, impact = t > .82 && t < 1.18, cheek = ptH(other, other === 0 ? -32 : 32, -34), recoil = t > .86 && t < 1.9;
            if (b === actor) {
                return {
                    x: 68, rot: 3, hr: t < .55 ? 8 : impact ? 24 : 8, hx: impact ? 16 : 0, eye: 1, mouth: .22, blush: .6, ik: t > .32 && t < 1.22 ? [cheek[0], cheek[1] + (impact ? Math.sin(t * 34) * 1.5 : 0)] : null, i1: -28, i2: -12, o1: impact ? 34 : 18, o2: impact ? 22 : 10
                };
            }
            const kick = recoil ? Math.sin((t - .86) * 17) : 0;
            return {
                x: 66 + kick * 5, y: Math.abs(kick) * 1.2, rot: recoil ? -kick * 2.8 : 0, hr: recoil ? -12 - kick * 3 : 0, eye: recoil ? .12 : 1, mouth: recoil ? .7 : .15, blush: recoil ? 1 : .45, i1: -24, i2: -10, o1: 24, o2: 10
            };
        },
        tummy: (t, b) => {
            /* tummyLvl 1..3 grows each time you keep scratching: faster giggles, bigger wiggles */
            const L = tummyLvl, sw = Math.sin(t * (9 + L * 3)), rub = t > .45 && t < END.tummy - .45;
            if (b === actor)
                return {
                    x: 75 + Math.sin(t * 2) * 1.2, rot: 3, hr: rub ? 22 + sw * 2 : 9, hx: rub ? 20 : 6, eye: 1, mouth: .45, blush: .75, ear: rub ? 4 : 0, i1: -16, i2: -8, o1: 18, o2: 8
                };
            const g = rub ? Math.min(1, (t - .45) / .5) : 0, f = 11 + L * 2, flap = Math.abs(Math.sin(t * f));
            return {
                x: 75 + g * Math.sin(t * (7 + L)) * 1.5, y: -g * flap * (2 + L * 1.2), rot: g * Math.sin(t * f) * (2.4 + L * 1.1), hr: -8 + g * Math.sin(t * f + 1) * (3 + L * 1.4), eye: rub ? .18 : 1, eh: 1, mouth: rub ? .5 + .45 * Math.abs(Math.sin(t * (13 + L * 2))) : .3, blush: 1,
                sq: g * Math.sin(t * (22 + L * 3)) * (.6 + .2 * L), ear: g * Math.sin(t * (14 + L * 2)) * (6 + L * 2.5),
                i1: -24 - g * flap * (10 + L * 4), i2: -10 - g * flap * 6, o1: 24 + g * flap * (10 + L * 4), o2: 10 + g * flap * 6
            };
        },
        hug: (t, b) => {
            const o = 1 - b, sq = t > 1.4 ? Math.sin((t - 1.4) * 3.2) : 0, r = {
                x: 64 + 2 * sq, y: -2.5 * Math.abs(sq), rot: 2, hr: 12, hx: -18, hy: 2 * sq, eye: t > .9 ? .1 : 1, mouth: .1, blush: .9, o1: 30, o2: 20
            };
            if (t < .6)
                Object.assign(r, {
                    i1: -82, i2: -8, o1: 82, o2: 8, hr: 3, hx: 0, x: 36, y: -5 * Math.abs(Math.sin(t * 5))
                });
            else
                r.ik = ptL(o, -6, -58);
            return r;
        },
        kiss: (t, b) => {
            const a = actor, o = 1 - a, go = t > .8 && t < 2.6;
            if (b === a)
                return {
                    x: go ? 68 : 50, rot: go ? 6 : 0, hr: go ? 22 : 5, hx: go ? 32 : 0, eye: go ? .1 : 1, mouth: go ? .3 : .1, pk: go ? 1 : 0, blush: .7, ik: t > .4 ? ptL(o, -14, -66) : null, i1: -40, i2: -10
                };
            const sh = t > 1.2 && t < 2.9;
            return {
                x: 50, hr: sh ? -4 : 6, hy: sh ? -3 : 0, eye: t > 1.25 && t < 3 ? .1 : 1, mouth: .12, blush: t > 1.2 ? 1 : .5, ik: sh ? ptH(b, 34, -24) : null, i1: -40, i2: -10
            };
        },
        hands: t => ({
            x: 38, hr: 8, eye: 1, mouth: .2, blush: .7, ik: [300, G - 52 + Math.sin(t * 2.2) * 3.5], i1: -20, y: -1.5 * Math.abs(Math.sin(t * 2.2))
        }),
        sleep: (t, b) => ({
            x: 12, y: 12, rot: 72, hr: -48, hx: 20, hy: 2, eye: 0, eh: 0, mouth: 0, blush: .45, i1: -32, i2: -12, o1: 30, o2: 12
        }),
        dance: (t, b) => {
            const ph = t * 1.7 * Math.PI, hop = Math.abs(Math.sin(ph)), sw = Math.sin(ph / 2), sg = b ? -1 : 1;
            return {
                x: 38 + 12 * sw * sg, y: -16 * hop, rot: sg * sw * 7, hr: sg * Math.sin(ph / 2 + .8) * 10, hy: 2 * hop, eye: .1, mouth: .35 + .4 * hop, blush: .9, ik: [300 + sw * 10, G - 98 + Math.sin(ph * 2) * 5], o1: 105 + 35 * Math.sin(ph * 2 + b * Math.PI), o2: 10
            };
        },
        pet: (t, b) => {
            const r = 1 - actor, sw = Math.sin(t * 5);
            return b === actor ? {
                x: 64, hr: -5, hx: -8, mouth: .2, blush: .6, ik: (h => [h[0] + sw * 4, h[1] + Math.sin(t * 5 + 1.2) * 2.5])(ptH(r, -34, -50))
            } : {
                x: 64, hr: 14 + sw * 2, hx: 16, hy: Math.abs(sw) * 1.8, eye: .1, blush: 1, mouth: .25
            };
        },
        feed: (t, b) => {
            const a = actor, r = 1 - a, open = (t > 1.1 && t < 1.7) || (t > 2.65 && t < 3) || (t > 3.85 && t < 4.2), chew = (t > 1.7 && t < 2.65) || (t > 3 && t < 3.85) || (t > 4.2 && t < 5.2);
            if (b === a) {
                const k = t < .9 ? 40 : open ? 14 : chew ? 34 : t < 5.2 ? 34 : 44, M = ptH(r, 0, -22);
                return {
                    x: 64, hr: -6, hx: -16, mouth: .25, blush: .6, ik: [M[0] - S[a] * k, M[1] + 2]
                };
            }
            return {
                x: 64, hr: open ? 12 : chew ? 7 : 4, hx: open ? 8 : chew ? 3 : 0, mouth: open ? .9 : chew ? .2 + .2 * Math.abs(Math.sin(t * 14)) : t > 5.2 ? .05 : 0, eye: chew ? .12 : 1, blush: chew || t > 5.2 ? .9 : .5
            };
        },
        peekaboo: (t, b) => {
            const reveal = t < .8 ? 0 : t < 1.25 ? 1 : Math.max(0, 1 - (t - 1.25) * .45);
            if (b === actor)
                return {
                    x: 42, y: -2, rot: -2, hr: 10 + reveal * 7, eye: t < 1.1 ? 0 : 1, mouth: .18 + reveal * .28, blush: .75, o1: 58 - reveal * 20, o2: 20, i1: -34, i2: -12
                };
            return {
                x: 38, y: -Math.max(0, Math.sin(t * 3)) * 2, hr: -5, eye: t < .8 ? .12 : 1, mouth: .22, blush: .85
            };
        },
        bump: (t, b) => {
            const hit = t > .72 && t < 1.05, pulse = hit ? Math.sin((t - .72) * Math.PI / .33) : 0;
            return {
                x: 42 + (hit ? pulse * 3 : 0), y: hit ? -Math.abs(pulse) * 3 : 0, rot: b === actor ? 2 + pulse * 3 : -2 - pulse * 3, hr: b === actor ? 8 - pulse * 5 : -8 + pulse * 5, eye: hit ? .2 : 1, mouth: .22, blush: .8
            };
        }
    };
    const END = {
        kiss: 3.8, flykiss: 3.6, slap: 2.8, feed: 6.8, tummy: 4.6, peekaboo: 3.1, bump: 2.4
    };
    /* ---- plush upgrade: squish + ear secondary motion layered over the original poses ---- */
    const add = (k, f) => {
        const o = ACT[k];
        ACT[k] = (t, b) => Object.assign(o(t, b), f(t, b));
    };
    const sgn = b => b ? -1 : 1, pulse = (t, a, w) => t > a && t < a + w ? Math.sin((t - a) / w * Math.PI) : 0;
    add("hug", (t, b) => {
        const sq = t > 1.3 ? Math.sin((t - 1.3) * 3.4) : 0;
        return {
            sq: sq * .9 + Math.min(1, t / 1.2) * .35, ear: t > .9 ? -3 + sq * 4 : 6, blush: .95, rot: 2 + Math.sin(t * 1.6) * sgn(b)
        };
    });
    add("kiss", (t, b) => b === actor ? { ear: -3 } : { sq: pulse(t, 1.25, .7) * 1.2, ear: 9 * pulse(t, 1.25, 1.4) });
    add("flykiss", (t, b) => b === actor ? { ear: 4 } : { sq: pulse(t, 1.35, .6) * 1.1, ear: 2 + 10 * pulse(t, 1.3, 1.2) });
    add("slap", (t, b) => b === actor ? {} : { sq: t > .86 && t < 1.9 ? Math.sin((t - .86) * 17) * 1.2 : 0, ear: t > .86 && t < 2.4 ? Math.sin((t - .86) * 30) * 9 * Math.exp(-(t - .86) * 1.6) : 0 });
    add("hands", (t, b) => ({ rot: sgn(b) * Math.sin(t * 1.5) * 2, sq: Math.sin(t * 2.2) * .3, ear: 3 + Math.sin(t * 2.2 + b) * 3 }));
    add("dance", (t, b) => {
        const ph = t * 1.7 * Math.PI, hop = Math.abs(Math.sin(ph));
        return { sq: (.5 - hop) * 1.3, ear: Math.sin(ph * 2 + b) * 9 };
    });
    add("pet", (t, b) => b === actor ? {} : { sq: Math.abs(Math.sin(t * 5)) * .6, ear: -4 + Math.sin(t * 5) * 5 });
    add("feed", (t, b) => {
        const chew = (t > 1.7 && t < 2.65) || (t > 3 && t < 3.85) || (t > 4.2 && t < 5.2);
        return b === actor ? {} : { sq: chew ? Math.abs(Math.sin(t * 14)) * .9 : 0, ear: chew ? Math.sin(t * 14) * 4 : 0 };
    });
    add("sleep", (t, b) => ({ sq: Math.sin(t * 1.5) * .35, ear: -7 }));
    let ac, master, nbuf;

    function A() {
        if (!ac) {
            const C = window.AudioContext || window.webkitAudioContext;
            if (!C)
                return null;
            ac = new C();
            master = ac.createGain();
            master.gain.value = (snd ? .9 : 0);
            master.connect(ac.destination);
            const n = ac.sampleRate * 1.8 | 0, ib = ac.createBuffer(2, n, ac.sampleRate);
            for (let c = 0; c < 2; c++) {
                const d = ib.getChannelData(c);
                for (let i = 0; i < n; i++)
                    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
            }
            const cv = ac.createConvolver(), wg = ac.createGain();
            cv.buffer = ib;
            wg.gain.value = .3;
            master.connect(wg);
            wg.connect(cv);
            cv.connect(ac.destination);
            nbuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
            const d = nbuf.getChannelData(0);
            for (let i = 0; i < d.length; i++)
                d[i] = Math.random() * 2 - 1;
        }
        if (ac.state === "suspended")
            ac.resume();
        return ac;
    }

    function tone(f, d, v = .05, ty = "sine", dl = 0, gl = 0) {
        if (!snd)
            return;
        const c = A();
        if (!c)
            return;
        const t = c.currentTime + dl, o = c.createOscillator(), g = c.createGain();
        o.type = ty;
        o.frequency.setValueAtTime(f, t);
        if (gl)
            o.frequency.exponentialRampToValueAtTime(gl, t + d);
        g.gain.setValueAtTime(.0001, t);
        g.gain.exponentialRampToValueAtTime(v, t + Math.min(.03, d / 3));
        g.gain.exponentialRampToValueAtTime(.0001, t + d);
        o.connect(g);
        g.connect(master);
        o.start(t);
        o.stop(t + d + .05);
    }

    function nz(d, v, f, ty = "bandpass", dl = 0, att = .01) {
        if (!snd)
            return;
        const c = A();
        if (!c)
            return;
        const t = c.currentTime + dl, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
        s.buffer = nbuf;
        fl.type = ty;
        fl.frequency.value = f;
        fl.Q.value = .9;
        g.gain.setValueAtTime(.0001, t);
        g.gain.exponentialRampToValueAtTime(v, t + att);
        g.gain.exponentialRampToValueAtTime(.0001, t + d);
        s.connect(fl);
        fl.connect(g);
        g.connect(master);
        s.start(t, Math.random());
        s.stop(t + d + .05);
    }
    const kiss = () => {
        tone(280, .12, .04, "sine", 0, 400);
        nz(.025, .16, 3400, "bandpass", .1);
        tone(1250, .08, .09, "sine", .1, 380);
        nz(.05, .08, 1300, "lowpass", .11);
        tone(1976, .4, .022, "sine", .2);
        tone(2637, .3, .012, "sine", .26);
    };
    const crunch = () => {
        for (let i = 0; i < 4; i++)
            nz(.022, .2 - .03 * i, 2200 + Math.random() * 2600, "bandpass", i * .04);
        tone(130, .09, .08, "sine", 0, 70);
    };
    const chew = n => {
        for (let i = 0; i < n; i++) {
            const d = i * .26;
            nz(.13, .07, 520 + Math.random() * 200, "lowpass", d);
            tone(230, .1, .03, "sine", d, 150);
        }
    };
    const yum = () => {
        tone(392, .14, .05, "triangle", 0, 350);
        tone(523, .22, .045, "triangle", .14, 600);
        tone(659, .4, .035, "sine", .3);
    };
    const box = (f, d = 0, v = .03) => {
        tone(f, 1.5, v, "sine", d);
        tone(f * 2, .9, v * .3, "sine", d);
        tone(f * 3, .5, v * .12, "sine", d);
    };
    const breath = () => {
        nz(1.6, .05, 620, "bandpass", 0, 1.2);
        nz(1.7, .04, 400, "bandpass", 1.7, .3);
        tone(98, 3.2, .014);
    };
    const LULL = [
        [784, 659, 587, 659], [784, 784, 784, 0], [659, 659, 659, 0], [784, 988, 988, 0]
    ];
    const SC = [523, 587, 659, 784, 880], MEL = [0, 2, 4, 2, 3, 2, 1, -1, 0, 2, 4, 3, 4, 2, 1, -1], BASS = [131, 196, 220, 175];
    const pluck = f => {
        tone(f, .22, .05, "triangle");
        tone(f * 2, .14, .015, "sine");
    };
    const beat = n => {
        const bt = n >> 1;
        if (n % 2 === 0) {
            tone(125, .2, .14, "sine", 0, 42);
            if (bt % 2)
                nz(.1, .09, 1900);
            tone(BASS[(bt >> 1) % 4], .5, .05, "triangle");
        }
        else
            nz(.04, .03, 7500, "highpass");
        const m = MEL[n % 16];
        if (m >= 0)
            pluck(SC[m]);
    };
    const pat = n => {
        tone(230, .16, .06, "sine", 0, 150);
        tone(880, .6, .012, "sine", .02);
        if (n % 4 === 0)
            tone(330, .7, .03, "triangle", .05, 392);
    };
    let tm = [], lp = [];
    const later = (f, ms) => {
        const id = setTimeout(f, ms);
        tm.push(id);
        return id;
    }, loop = (f, ms) => {
        f(0);
        let n = 0;
        lp.push(setInterval(() => f(++n), ms));
    };
    const mid = () => [300, G - 90];

    function flyFx(sym, x1, y1, x2, y2, col = "#f28db5", sz = 22) {
        const e = document.createElementNS("http://www.w3.org/2000/svg", "text");
        e.textContent = sym;
        e.setAttribute("x", x1);
        e.setAttribute("y", y1);
        e.setAttribute("fill", col);
        e.setAttribute("font-size", sz);
        e.setAttribute("text-anchor", "middle");
        e.style.transformBox = "fill-box";
        e.style.transformOrigin = "center";
        $B("fx").appendChild(e);
        if (reduceMotion) {
            e.setAttribute("x", x2);
            e.setAttribute("y", y2);
            e.setAttribute("opacity", ".8");
            return;
        }
        const dx = x2 - x1, dy = y2 - y1;
        e.animate([{ transform: "translate(0,0) scale(.55)", opacity: 0 }, { opacity: 1, offset: .18 }, { transform: `translate(${dx}px,${dy}px) scale(1.25)`, opacity: 0 }], { duration: 1250, easing: "cubic-bezier(.2,.7,.25,1)" }).onfinish = () => e.remove();
    }

    function fx(sym, x, y, col = "#f4789f", sz = 22) {
        const e = document.createElementNS("http://www.w3.org/2000/svg", "text");
        e.textContent = sym;
        e.setAttribute("x", x);
        e.setAttribute("y", y);
        e.setAttribute("fill", col);
        e.setAttribute("font-size", sz);
        e.setAttribute("text-anchor", "middle");
        e.style.transformBox = "fill-box";
        e.style.transformOrigin = "center";
        $B("fx").appendChild(e);
        if (reduceMotion) {
            e.setAttribute("opacity", ".75");
            return;
        }
        const dx = (Math.random() - .5) * 50;
        e.animate([{ transform: "translate(0,0) scale(.4)", opacity: 0 }, { opacity: 1, offset: .25 }, { transform: `translate(${dx}px,-70px) scale(1.15)`, opacity: 0 }], { duration: 1900, easing: "ease-out" }).onfinish = () => e.remove();
    }
    const burst = (x, y, n = 5, sym = "♥") => {
        for (let i = 0; i < n; i++)
            later(() => fx(sym, x + (Math.random() - .5) * 50, y, i % 2 ? "#f4789f" : "#d79ae8", 16 + Math.random() * 14), i * 130);
    };
    const TXT = (a, by) => {
        const o = 1 - by, n = NAME[by], m = NAME[o];
        return {
            hug: `${n} hugs ${m} 🤗`, kiss: `${n} gives ${m} a sweet kiss 💋`, hands: `${n} and ${m} hold paws 🫶`, feed: `${n} shares a strawberry with ${m} 🍓`, sleep: `${n} and ${m} drift off peacefully 💤`, dance: `${n} and ${m} are dancing together 💃`, pet: `${n} gently pets ${m} 🐾`, tummy: `${n} gives ${m} gentle tummy tickles! 🫳`, flykiss: `${n} blows ${m} a flying kiss! 💋`, slap: `${n} gives ${m} a playful little slap! 🖐️`, idle: `${n} and ${m} are relaxing 🌸`
        }[a];
    };

    function start(a, by) {
        tm.forEach(clearTimeout);
        lp.forEach(clearInterval);
        tm = [];
        lp = [];
        $B("fx").innerHTML = "";
        cur = a;
        actor = by;
        t0 = performance.now();
        if (a === "tummy") {
            const n = performance.now();
            tummyLvl = n - tummyAt < 9000 ? Math.min(3, tummyLvl + 1) : 1;
            tummyAt = n;
            END.tummy = 4.2 + .5 * tummyLvl;
        }
        rate = a === "dance" ? 13 : a === "sleep" ? 4.5 : 7;
        berryS = 1;
        const bears = $B("bears"), backArm = $B("tummyBackArm");
        if (a === "tummy") {
            bears.appendChild($B("s" + by));
            bears.appendChild(backArm);
            bears.appendChild($B("s" + (1 - by)));
        }
        else {
            backArm.setAttribute("opacity", "0");
            const ord = a === "flykiss" || a === "slap" || a === "feed" || a === "pet" || a === "kiss" ? [1 - by, by] : [0, 1];
            ord.forEach(i => bears.appendChild($B("s" + i)));
        }
        const scene = svg.closest(".couple-bears-scene");
        if (scene)
            scene.dataset.action = a;
        if (a === "hug") {
            tone(262, 1.4, .04);
            tone(330, 1.4, .035, "sine", .06);
            tone(392, 1.5, .03, "sine", .12);
            later(() => {
                tone(196, 1, .06, "triangle");
                tone(523, .9, .02, "sine", .1);
                burst(300, G - 170, 5);
            }, 1250);
        }
        if (a === "kiss") {
            later(() => {
                kiss();
                burst(300, G - 170, 6);
            }, 1350);
            later(() => {
                nz(.03, .1, 2500);
                tone(900, .06, .05, "sine", 0, 500);
            }, 2600);
        }
        if (a === "flykiss") {
            later(() => {
                tone(740, .16, .04, "sine", 0, 980);
                tone(988, .22, .035, "sine", .12, 1318);
                const from = ptH(by, 0, -28), to = ptH(1 - by, 0, -34);
                flyFx("♡", from[0], from[1], to[0], to[1], "#ed79a5", 27);
                later(() => flyFx("💋", from[0], from[1] - 4, to[0], to[1] - 12, "#e98bad", 20), 180);
            }, 850);
        }
        if (a === "slap") {
            later(() => {
                tone(210, .11, .07, "triangle", 0, 115);
                nz(.045, .08, 1450, "bandpass", .015);
                const cheek = ptH(1 - by, 1 - by === 0 ? -32 : 32, -34);
                burst(cheek[0], cheek[1], 5, "✦");
            }, 920);
        }
        if (a === "hands") {
            later(() => {
                [1047, 1319, 1568, 2093, 1568].forEach((f, i) => tone(f, .55, .025, "sine", i * .08));
                burst(300, G - 70, 5, "✦");
            }, 800);
        }
        if (a === "feed") {
            BITES.forEach((b, index) => later(() => {
                crunch();
                later(() => chew(3), 220);
                if (index === 2)
                    later(yum, 500);
            }, b * 1000));
            later(() => burst(CX[1 - by] + S[1 - by] * 30, G - 190, 4), 5600);
        }
        if (a === "sleep") {
            loop(n => {
                breath();
                LULL[n % 4].forEach((f, k) => f && box(f, k * .8));
                if (n % 2 === 0)
                    later(() => fx("z", 300 + (Math.random() - .5) * 60, G - 100, "#9b86d6", 20 + Math.random() * 10), 500);
            }, 3400);
        }
        if (a === "dance") {
            loop(n => {
                beat(n);
                if (n % 4 === 0)
                    fx("♪", 300 + (Math.random() - .5) * 120, G - 170, "#b08be0", 22);
            }, 294);
        }
        if (a === "pet") {
            tone(300, .5, .03, "triangle");
            loop(n => {
                pat(n);
                if (n % 2 == 0) {
                    const h = ptH(1 - by, 0, -80);
                    fx("♥", h[0], h[1] - 20, "#f4789f", 16);
                }
            }, 628);
        }
        if (a === "tummy") {
            tone(660, .18, .035, "sine", 0, 820);
            tone(784, .2, .03, "sine", .22, 988);
            later(() => fx("hehe!", CX[1 - by], G - 165, "#e0669a", 15), 650);
            if (tummyLvl > 1)
                later(() => fx("hihi~", CX[1 - by] + (by ? 30 : -30), G - 185, "#e0669a", 14), 1200);
            if (tummyLvl > 2)
                later(() => fx("so happy! ♡", CX[1 - by], G - 200, "#e0669a", 14), 1900);
            loop(n => {
                pat(n);
                if (n > 1 && n % 2)
                    tone(820 + Math.random() * 420, .09, .03, "sine", 0, 1250);
                if (n % 2 === 0) {
                    const side = by === 0 ? 1 : -1, hx = CX[1 - by] + side * (63 + Math.sin(n * 1.8) * 2), hy = G - 38 + Math.sin(n * 2.4) * 5;
                    fx(n % 4 === 0 ? "♡" : "✦", hx, hy - 10, "#f28db5", 14 + Math.random() * 5);
                    if (tummyLvl > 1)
                        fx("♥", hx + side * 10, hy - 26, "#f4789f", 12 + Math.random() * 8);
                }
            }, 420 - tummyLvl * 50);
        }
        if (a === "idle") {
            tone(392, .7, .025, "sine", 0, 330);
        }
        if (END[a])
            later(() => {
                if (cur === a)
                    start("idle", by);
            }, END[a] * 1000);
    }
    const blink = [{ n: 1.5, u: 0 }, { n: 3, u: 0 }];
    let last = performance.now();
    const setT = (id, v) => $B(id).setAttribute("transform", v);

    function drawArm(b, n, s, a1, a2) {
        const f = fk(s, a1, a2), d = `M${f[0][0]} ${f[0][1]}Q${f[1][0]} ${f[1][1]} ${f[2][0]} ${f[2][1]}`, id = n + 0 + b;
        $B(id + "o").setAttribute("d", d);
        $B(id + "f").setAttribute("d", d);
        $B(id + "co").setAttribute("cx", f[2][0]);
        $B(id + "co").setAttribute("cy", f[2][1]);
        setT(id + "p", `translate(${f[2][0]} ${f[2][1]}) rotate(${f[3]})`);
        return f;
    }

    function frame(now) {
        if (!active || !svg.isConnected)
            return;
        const dt = Math.min(.05, (now - last) / 1e3);
        last = now;
        const t = (now - t0) / 1e3, ts = now / 1e3, k = 1 - Math.exp(-dt * rate);
        sleepF += ((cur === "sleep" ? 1 : 0) - sleepF) * (1 - Math.exp(-dt * 2.5));
        const tg = [0, 1].map(b => {
            const o = Object.assign(idle(b, ts), ACT[cur](t, b));
            if (o.ik) {
                const [a1, a2] = ik(...toL(b, o.ik[0], o.ik[1]));
                o.i1 = a1;
                o.i2 = a2;
            }
            return o;
        });
        for (let b = 0; b < 2; b++) {
            const p = P[b], g = tg[b];
            for (const key of K) {
                if (EXP[key])
                    p[key] += (g[key] - p[key]) * (1 - Math.exp(-dt * (key === "eye" ? 16 : 9)));
                else {
                    const arm = key[0] === "i" || key[0] === "o", w = (arm ? 1.25 : 1) * rate * 1.15, z = arm ? .72 : .78, vv = V[b];
                    vv[key] = (vv[key] || 0) + ((g[key] - p[key]) * w * w - 2 * z * w * (vv[key] || 0)) * dt;
                    p[key] += vv[key] * dt;
                }
            }
            const br = reduceMotion ? 0 : Math.sin(ts * (sleepF > .5 ? 1.5 : 2.1) + b), bs = 1 + br * (.012 + .02 * sleepF), bl = blink[b];
            if (!reduceMotion && ts > bl.n) {
                bl.u = ts;
                bl.n = ts + 2.5 + Math.random() * 3;
            }
            const bf = !reduceMotion && ts - bl.u < .14 ? .1 : 1;
            setT("s" + b, `translate(${CX[b]} ${G + p.y}) scale(${S[b]} 1)`);
            setT("p" + b, `translate(${p.x} 0) rotate(${p.rot} 0 -50)`);
            {
                const kick = cur === "tummy" && b !== actor && !reduceMotion ? Math.min(1, Math.max(0, t - .45) * 2) : 0, mv = reduceMotion ? 0 : Math.max(kick, cur === "dance" ? 1 : Math.min(1, Math.abs(V[b].x || 0) / 22)), ph = ts * (cur === "dance" ? 1.7 * Math.PI * 2 : kick ? 17 + tummyLvl * 2 : 13), ll = Math.max(0, Math.sin(ph)) * mv, lr = Math.max(0, -Math.sin(ph)) * mv, sp = sleepF * 14;
                setT("lg" + b + "l", `translate(0 ${-ll * (7 + kick * 5)}) rotate(${-ll * (10 + kick * 14) - sp} -22 -22)`);
                setT("lg" + b + "r", `translate(0 ${-lr * (7 + kick * 5)}) rotate(${lr * (10 + kick * 14) + sp} 22 -22)`);
            }
            setT("bd" + b, `translate(0 -10) scale(${1 + p.sq * .025} ${bs - p.sq * .03}) translate(0 10)`);
            setT("h" + b, `translate(${p.hx} ${-70 + p.hy - br * (.8 + sleepF)}) rotate(${p.hr}) scale(${1 + p.sq * .035} ${1 - p.sq * .045})`);
            {
                const lag = Math.max(-16, Math.min(16, -(V[b].hr || 0) * .07));
                setT("er" + b + "l", `rotate(${lag - p.ear} -40 -64)`);
                setT("er" + b + "r", `rotate(${lag + p.ear} 40 -64)`);
            }
            drawArm(b, "o", -28, p.o1, p.o2);
            drawArm(b, "i", 28, p.i1, p.i2);
            const cl = p.eye < .25, op = Math.max(.06, p.eye * bf);
            for (const e of ["l", "r"]) {
                const x = e === "l" ? -26 : 26;
                setT("e" + b + e, `translate(${x} -36)`);
                const ee = $B("ee" + b + e);
                ee.setAttribute("ry", 5.4 * op);
                ee.style.opacity = cl ? 0 : 1;
                const ea = $B("ea" + b + e);
                ea.setAttribute("d", `M-5.5 ${p.eh > .5 ? 2 : -1}Q0 ${p.eh > .5 ? -5 : 6} 5.5 ${p.eh > .5 ? 2 : -1}`);
                ea.style.opacity = cl ? 1 : 0;
                $B("bl" + b + e).style.opacity = Math.min(1, p.blush);
            }
            const m = Math.max(0, p.mouth), w = 6.5 - 3.5 * p.pk, tp = 6 * (1 - m * .9), bt = 6 + 16 * m;
            $B("mo" + b).setAttribute("d", `M${-w} 0Q0 ${tp} ${w} 0Q0 ${bt} ${-w} 0Z`);
            const sh = $B("sh" + b);
            sh.setAttribute("cx", CX[b] + S[b] * p.x);
            sh.setAttribute("rx", 48 - p.y * .7);
            sh.setAttribute("opacity", .16 * (1 - sleepF) * (1 + p.y / 60));
        }
        const backArm = $B("tummyBackArm");
        if (cur === "tummy") {
            const side = actor === 0 ? 1 : -1, target = 1 - actor, startX = CX[actor] + S[actor] * (P[actor].x + 28), startY = G + P[actor].y - 76, endX = startX + side * 42, endY = startY + 8 + Math.sin(t * (9 + tummyLvl * 3)) * (3.2 + tummyLvl * .8), controlX = (startX + endX) / 2, controlY = startY + 5 + Math.sin(t * 4) * 2, path = `M${startX} ${startY} Q${controlX} ${controlY} ${endX} ${endY}`, c = COL[actor];
            $B("tummyBackArmOutline").setAttribute("d", path);
            $B("tummyBackArmFill").setAttribute("d", path);
            $B("tummyBackArmOutline").setAttribute("stroke", c.st);
            $B("tummyBackArmFill").setAttribute("stroke", c.fur);
            $B("tummyBackPaw").setAttribute("transform", `translate(${endX} ${endY}) rotate(${side * 8 + Math.sin(t * (9 + tummyLvl * 3)) * 7})`);
            backArm.setAttribute("opacity", t > .35 && t < END.tummy - .35 ? "1" : "0");
        }
        else
            backArm.setAttribute("opacity", "0");
        $B("pil").setAttribute("opacity", sleepF);
        $B("blk").setAttribute("opacity", sleepF);
        const bs = $B("berry");
        if (cur === "feed" && t < 5.3) {
            const f = fk(28, P[actor].i1, P[actor].i2), h = f[2], rad = f[3] * R, wp = ptL(actor, h[0] - Math.sin(rad) * 8, h[1] + Math.cos(rad) * 8), sc = t < 1.7 ? 1 : t < 3 ? .66 : t < 4.2 ? .36 : 0;
            berryS += (sc - berryS) * (1 - Math.exp(-dt * 14));
            bs.setAttribute("transform", `translate(${wp[0]} ${wp[1]}) scale(${berryS * .9}) rotate(${-S[actor] * 20})`);
            bs.setAttribute("opacity", berryS > .05 ? 1 : 0);
        }
        else
            bs.setAttribute("opacity", 0);
        rafId = requestAnimationFrame(frame);
    }
    rafId = requestAnimationFrame(frame);

    function setSound(enabled) {
        snd = !!enabled;
        if (master && ac && ac.state !== "closed") {
            try {
                master.gain.setTargetAtTime(snd ? .9 : 0, ac.currentTime, .04);
            }
            catch { }
        }
    }

    function destroy() {
        if (!active)
            return;
        active = false;
        cancelAnimationFrame(rafId);
        tm.forEach(clearTimeout);
        lp.forEach(clearInterval);
        tm = [];
        lp = [];
        if (ac && ac.state !== "closed")
            void ac.close().catch(() => { });
    }
    return {
        play(action, by) {
            if (active && ACT[action])
                start(action, by === 1 ? 1 : 0);
        },
        setSound,
        destroy
    };
}