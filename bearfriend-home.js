/* bearfriend-home.js
   The Bearfriend home frame: rooms, day/night, seasons, weather, the bunny, the two bears.
   Needs: bear-pose-engine.js (createBearfriendHomeEngine) loaded first, and the markup in bearfriend-home-frame.html.

   API (window.BearfriendHome, available after mount):
     triggerBearAction(action, options = {})   options: { by: 0|1, remote: bool }  -> fires 'bearfriend:action' unless remote
     runLocalAction(action, by = 0)            plays the animation only (no points, no event)
     createBearPoseEngine(svg)                 the pose engine (this is createBearfriendHomeEngine)
     setScene(room, time, weather)             room: living|kitchen|bedroom|balcony|garden, time: morning|afternoon|evening|night|auto, weather: clear|rain|snow
     mount(rootEl)                             call manually if the frame is rendered after page load
     unmount(rootEl)                           stop all timers/loops/listeners; call before the Home section is removed
   Events: 'bearfriend:action' (window), 'bearfriend:remote' (window, listen), 'bearfriend:progress' (on the root, bubbles) */
(function () {
    function mountBearfriendHome(ROOT) {
        if (ROOT.__bfh)
            return ROOT.__bfh;
        if (typeof createBearfriendHomeEngine !== 'function')
            throw new Error('bear-pose-engine.js must be loaded before bearfriend-home.js');
        // Lifecycle tracking so the home can be mounted/unmounted when the app re-renders Home.
        // These shadow the globals inside this mount only; destroy() clears everything they started.
        const _ints = [], _lis = [];
        let _dead = false;
        const setInterval = (f, t) => { const id = window.setInterval(f, t); _ints.push(id); return id; };
        const addEventListener = (t, f, o) => { window.addEventListener(t, f, o); _lis.push([t, f, o]); };
        const requestAnimationFrame = f => _dead ? 0 : window.requestAnimationFrame(f);

// ------------------------------------------------------------
// Setup: DOM helpers, state, seasons
// ------------------------------------------------------------

        const $ = s => ROOT.querySelector(s), $$ = s => [...ROOT.querySelectorAll(s)];
        const st = {
            room: 'living', time: 'auto', wx: 'clear', snd: false, it: { plant: 1, lamp: 1, pics: 1 }, plots: [0, 0, 0, 0], rare: [0, 0, 0, 0], petals: 0, season: 'auto', gift: null, bonus: 0, tasks: {
                water: 0, feed: 0, hug: 0, kiss: 0, bunny: 0
            }
        };
        const COLS = ['#ff9ec0', '#c9a6ff', '#ffd36b', '#8fd3ff'];
        const SEQ = ['spring', 'summer', 'autumn', 'winter'], SN = {
            spring: '🌸 Spring', summer: '☀️ Summer', autumn: '🍂 Autumn', winter: '⛄ Winter'
        };
        let sOff = 0;
        const baseSeason = () => {
            const m = new Date().getMonth();
            return m >= 2 && m <= 4 ? 0 : m >= 5 && m <= 7 ? 1 : m >= 8 && m <= 10 ? 2 : 3;
        };
        const seasonOf = () => SEQ[(baseSeason() + sOff) % 4];
        const ST = {
            spring: 'rgba(255,170,200,.03)', summer: 'rgba(255,225,110,.02)', autumn: 'rgba(255,140,60,.03)', winter: 'rgba(235,205,200,.03)'
        };

        function sTint(t) {
            const c = ST[seasonOf()];
            return `linear-gradient(${c},${c}),${t}`;
        }
        const SE = {
            spring: ['#bfe3b4', '#a9d99f', '#9fd493'], summer: ['#a9dca0', '#8fd081', '#82c874'], autumn: ['#ecd6a4', '#e0bc7c', '#d6ae6c'], winter: ['#f4f8fc', '#e3ecf5', '#d8e4f0']
        };
        const GC = { rose: '#ff7aa2', berries: '#b05fd6', note: '#ffd36b' }, GE = { rose: '🌹', berries: '🍓', note: '💌' };
        const TK = [
            ['water', '💧 Water 3 flowers', 3], ['feed', '🍓 Share a strawberry', 1], ['hug', '🤗 Share a hug', 1], ['kiss', '💋 Send a kiss', 1], ['bunny', '🐰 Cuddle the bunny', 1]
        ];
        const giftSvg = () => st.gift ? `<g id="gift" style="cursor:pointer" transform="translate(300 372)"><rect x="-22" y="-34" width="44" height="40" fill="transparent"/><g class="gbob"><rect x="-15" y="-24" width="30" height="24" rx="4" fill="${GC[st.gift]}" stroke="#fff" stroke-width="2"/><rect x="-3" y="-24" width="6" height="24" fill="#fff" opacity=".8"/><path d="M0-24c-9-10-15-2-8 2zM0-24c9-10 15-2 8 2z" fill="#fff"/><text y="-7" font-size="11" text-anchor="middle">${GE[st.gift]}</text></g></g>` : '';

// ------------------------------------------------------------
// Time of day, sky and scenery helpers
// ------------------------------------------------------------

        const phase = () => {
            if (st.time !== 'auto')
                return st.time;
            const h = new Date().getHours();
            return h >= 6 && h < 11 ? 'morning' : h >= 11 && h < 17 ? 'afternoon' : h >= 17 && h < 20 ? 'evening' : 'night';
        };
        const SKY = {
            morning: ['#ffc79a', '#fff0dc'], afternoon: ['#ffd9a6', '#fff4e2'], evening: ['#ef7d5c', '#fbc78e'], night: ['#2b2050', '#5b4780']
        };
        const mix = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(a.substr(i, 2), 16) * (1 - t) + parseInt(b.substr(i, 2), 16) * t).toString(16).padStart(2, '0')).join('');
        const stars = (x, y, w, h, n) => '<g id="stars" style="opacity:0;transition:opacity 1s" fill="#fff">' + Array.from({ length: n }, (_, i) => `<circle cx="${x + (i * 47 + 13) % w}" cy="${y + (i * 31 + 7) % h}" r="${i % 3 ? .9 : 1.5}"/>`).join('') + '</g>';
        const cloud = (x, y, s) => `<g class="cl" style="opacity:0;transition:opacity 1s" fill="#fff"><ellipse cx="${x}" cy="${y}" rx="${26 * s}" ry="${9 * s}"/><ellipse cx="${x + 14 * s}" cy="${y - 7 * s}" rx="${16 * s}" ry="${9 * s}"/><ellipse cx="${x - 12 * s}" cy="${y - 5 * s}" rx="${13 * s}" ry="${8 * s}"/></g>`;
        let ORB;

// ------------------------------------------------------------
// Room SVG builders (living room, kitchen, bedroom, balcony, garden) and the bunny
// ------------------------------------------------------------

        const win = () => {
            ORB = {
                x: 258, y: 155, w: 84, h: 80, r: 11
            };
            return `<clipPath id="wc"><rect x="258" y="155" width="84" height="80" rx="8"/></clipPath><rect x="252" y="149" width="96" height="92" rx="12" fill="#fff" stroke="#e8c6d4" stroke-width="4"/><g clip-path="url(#wc)"><rect x="258" y="155" width="84" height="80" fill="url(#sk)"/>${stars(258, 155, 84, 80, 9)}<g id="orb"><circle r="22" opacity=".25"/><circle r="11"/></g>${cloud(285, 185, .8)}${cloud(325, 205, .7)}</g><path d="M300 155V235M258 195H342" stroke="#fff" stroke-width="3"/><rect x="246" y="240" width="108" height="8" rx="4" fill="#f3d3df"/><path d="M244 140Q262 190 248 245H232V140Z" fill="#f6b8cf"/><path d="M356 140Q338 190 352 245H368V140Z" fill="#f6b8cf"/>`;
        };
        const items = () => (st.it.plant ? '<path d="M100 300h24l-3-26h-18z" fill="#e9a58c"/><ellipse cx="104" cy="262" rx="7" ry="15" fill="#6fbf7f" transform="rotate(-25 104 262)"/><ellipse cx="120" cy="258" rx="7" ry="17" fill="#7fcf8f" transform="rotate(22 120 258)"/><ellipse cx="112" cy="252" rx="6" ry="17" fill="#5fb272"/>' : '') + (st.it.lamp ? '<circle id="glow" cx="488" cy="196" r="72" fill="url(#lg)" style="opacity:0;transition:opacity 1.2s"/><rect x="486" y="208" width="4" height="92" fill="#c9a27a"/><path d="M470 208h36l-8-26h-20z" fill="#fff1c9" stroke="#e8c98a" stroke-width="2"/><ellipse cx="488" cy="301" rx="15" ry="4" fill="#c9a27a"/>' : '') + (st.it.pics ? '<rect x="150" y="136" width="42" height="34" rx="3" fill="#fff" stroke="#d9b48f" stroke-width="3"/><text x="171" y="160" font-size="16" text-anchor="middle">🐻</text><rect x="408" y="136" width="42" height="34" rx="3" fill="#fff" stroke="#d9b48f" stroke-width="3"/><text x="429" y="160" font-size="16" text-anchor="middle">🌷</text>' : '');
        const stripes = c => '<g opacity=".4" stroke="' + c + '" stroke-width="3">' + Array.from({ length: 22 }, (_, i) => `<path d="M${i * 28} 120V290"/>`).join('') + '</g>';
        const room = r => {
            const L = r === 'living';
            return `<rect width="600" height="400" fill="${L ? '#fbe4ea' : '#ece1f9'}"/>${stripes(L ? '#f5c9d8' : '#dcc8f0')}${win()}<rect y="292" width="600" height="110" fill="${L ? '#f0cfae' : '#e6cbbd'}"/><path d="M0 320H600M0 350H600M0 380H600" stroke="${L ? '#e2b98f' : '#d6b3a3'}" stroke-width="2"/><rect y="286" width="600" height="8" fill="#fff"/>` + (L ? '<ellipse cx="300" cy="338" rx="120" ry="24" fill="#f7c1d4" stroke="#fff" stroke-width="4" stroke-dasharray="2 8"/>' : '<rect x="150" y="250" width="300" height="52" rx="14" fill="#d8b4e2"/><rect x="142" y="280" width="316" height="42" rx="12" fill="#fff" stroke="#e6cff0" stroke-width="3"/><rect x="142" y="296" width="316" height="26" rx="12" fill="#f6b8cf"/>') + (L ? '' : '<path d="M440 321q28 24 56 0z" fill="#e0bb94" stroke="#c49a73" stroke-width="2"/>') + items();
        };
        const plant = i => {
            const s = st.plots[i], c = st.rare[i] ? '#ffcf3d' : COLS[i];
            if (!s)
                return '';
            if (s === 1)
                return '<circle cy="-3" r="3.2" fill="#6b4a2f"/>';
            const stem = `<path d="M0 0Q-2-14 0-${s === 2 ? 20 : s === 3 ? 30 : 36}" stroke="#58a56a" stroke-width="3" fill="none" stroke-linecap="round"/>`, lf = '<ellipse cx="-8" cy="-10" rx="7" ry="3.5" fill="#6fbf7f" transform="rotate(-25 -8 -10)"/><ellipse cx="8" cy="-14" rx="7" ry="3.5" fill="#6fbf7f" transform="rotate(25 8 -14)"/>';
            if (s === 2)
                return stem + lf;
            if (s === 3)
                return stem + lf + `<ellipse cy="-34" rx="6" ry="8" fill="${c}"/>`;
            let p = '';
            for (let k = 0; k < 6; k++) {
                const a = k * Math.PI / 3;
                p += `<circle cx="${Math.cos(a) * 9}" cy="${-40 + Math.sin(a) * 9}" r="7" fill="${c}"/>`;
            }
            return `<g class="sw">${stem}${lf}${p}<circle cy="-40" r="5" fill="${st.rare[i] ? '#fff' : '#ffe9a8'}"/></g>` + (st.rare[i] ? '<text y="-60" font-size="12" text-anchor="middle">✨</text>' : '');
        };
        const garden = () => {
            ORB = {
                x: 100, y: 130, w: 400, h: 110, r: 16
            };
            const G = SE[seasonOf()];
            let f = '';
            for (let x = 96; x < 510; x += 22)
                f += `<rect x="${x}" y="266" width="12" height="36" rx="4" fill="#fff"/>`;
            return `<rect width="600" height="400" fill="url(#sk)"/>${stars(100, 125, 400, 110, 16)}<g id="orb"><circle r="34" opacity=".25"/><circle r="16"/></g>${cloud(150, 170, 1.3)}${cloud(330, 150, 1.1)}${cloud(450, 190, 1.2)}<path d="M0 270Q110 215 230 262T440 250T600 240V400H0Z" fill="${G[0]}"/><path d="M0 300Q140 255 300 290T600 280V400H0Z" fill="${G[1]}"/>${f}<rect x="80" y="278" width="440" height="5" fill="#fff"/><rect y="300" width="600" height="110" fill="${G[2]}"/>` + [0, 1, 2, 3].map(i => `<g class="plot" data-i="${i}" transform="translate(${150 + i * 100} 352)"><ellipse rx="34" ry="11" fill="#a7774f"/><g id="pl${i}">${plant(i)}</g><ellipse rx="40" ry="46" cy="-24" fill="transparent"/></g>`).join('');
        };
        const bunnySvg = () => '<g id="treats"></g><ellipse id="bsh" rx="17" ry="4.6" fill="#9a6a86" opacity=".2"/><g id="bun"><ellipse cx="0" cy="-26" rx="38" ry="48" fill="transparent"/><g id="bf"><g class="bb"><ellipse cx="-6" cy="-12" rx="17" ry="13" fill="#fff" stroke="#e3cfd6" stroke-width="1.4"/><circle cx="-21" cy="-11" r="5" fill="#fff" stroke="#e3cfd6" stroke-width="1.4"/><g class="ears"><ellipse cx="3" cy="-46" rx="4.5" ry="13" fill="#fff" stroke="#e3cfd6" stroke-width="1.4" transform="rotate(-8 3 -46)"/><ellipse cx="14" cy="-45" rx="4.5" ry="13" fill="#fff" stroke="#e3cfd6" stroke-width="1.4" transform="rotate(10 14 -45)"/><ellipse cx="3" cy="-46" rx="2" ry="9" fill="#f7c3d1" transform="rotate(-8 3 -46)"/></g><circle cx="8" cy="-27" r="11" fill="#fff" stroke="#e3cfd6" stroke-width="1.4"/><ellipse id="be" cx="12" cy="-29" rx="2" ry="2.3" fill="#4a3433"/><ellipse cx="9" cy="-23" rx="3.5" ry="2" fill="#ff9fb8" opacity=".6"/><ellipse cx="17" cy="-26" rx="2" ry="1.4" fill="#e98aa4"/><path d="M19-25l8-2M19-24l8 1" stroke="#c9aab6" stroke-width="1" stroke-linecap="round" fill="none"/><text class="zz" x="14" y="-52" font-size="10" fill="#9b86d6" font-weight="800">z</text><text id="crt" x="18" y="-8" font-size="13" style="display:none">🥕</text></g></g></g>';
        let engine, bx = 300, by = 338, dir = 1, asleep = false, wb;
        const OUT = r => r === 'garden' || r === 'balcony';
        const treats = [];
        let arr = null, roomLock = 0, lastAct = 'idle', rtT = 0, lc = 0;
        const PAL = [['#ffd36b', '#ff9ec0', '#c9a6ff', '#8fd3ff'], ['#ff9ec0', '#ffd36b', '#ff9ec0', '#fff'], ['#8fd3ff', '#c9a6ff', '#8fd3ff', '#b6f0c8']];
        const ob = (o, x, y, inner, w = 36, h = 40) => `<g class="obj" data-o="${o}" transform="translate(${x} ${y})" style="cursor:pointer"><rect x="${-w / 2}" y="${-h}" width="${w}" height="${h + 6}" fill="transparent"/><g class="ig">${inner}</g></g>`;
        const edgeHints = () => '<g style="pointer-events:none" font-size="30" font-weight="800" fill="#fff" opacity=".6" text-anchor="middle"><text x="102" y="350">‹</text><text x="498" y="350">›</text></g>';
        const kitchen = () => {
            let t = '';
            for (let y = 120; y < 292; y += 24)
                t += `M0 ${y}H600`;
            for (let r = 0; r < 8; r++)
                for (let x = (r % 2) * 24; x < 600; x += 48)
                    t += `M${x} ${120 + r * 24}v24`;
            let f = '';
            for (let r = 0; r < 4; r++)
                for (let c = -1; c < 17; c++)
                    if ((r + c) % 2)
                        f += `<rect x="${c * 36 + (r % 2 ? 0 : 0)}" y="${292 + r * 28}" width="36" height="28" fill="#e8d2bb"/>`;
            const cab = x => `<rect x="${x}" y="244" width="190" height="48" rx="4" fill="#e9b99a"/><rect x="${x - 6}" y="234" width="202" height="12" rx="5" fill="#fff" stroke="#efd9cb" stroke-width="2"/><path d="M${x + 47} 247v43M${x + 95} 247v43M${x + 143} 247v43" stroke="#d9a07f" stroke-width="2"/><g fill="#fff"><circle cx="${x + 40}" cy="262" r="2.6"/><circle cx="${x + 54}" cy="262" r="2.6"/><circle cx="${x + 136}" cy="262" r="2.6"/><circle cx="${x + 150}" cy="262" r="2.6"/></g>`;
            return `<rect width="600" height="400" fill="#fff0e0"/><path d="${t}" stroke="#f0d3b2" stroke-width="2" fill="none" opacity=".85"/>${win()}${cab(60)}${cab(350)}<rect y="292" width="600" height="110" fill="#f6e6d4"/>${f}<rect y="286" width="600" height="8" fill="#fff"/>`;
        };
        const balcony = () => {
            ORB = {
                x: 100, y: 130, w: 400, h: 110, r: 16
            };
            const bl = [
                [96, 40, 70], [140, 34, 52], [178, 52, 88], [234, 38, 60], [276, 46, 96], [326, 34, 50], [362, 56, 80], [422, 40, 66], [466, 44, 90]
            ];
            let sk = '';
            bl.forEach(([x, w, h], k) => {
                sk += `<rect x="${x}" y="${292 - h}" width="${w}" height="${h}" rx="3" fill="#7d6fa6" opacity=".6"/>`;
                for (let j = 0; j < Math.floor(h / 16); j++)
                    for (let i = 0; i < Math.floor(w / 12); i++)
                        if ((i * 7 + j * 3 + k * 5) % 5 < 2)
                            sk += `<rect x="${x + 5 + i * 12}" y="${292 - h + 7 + j * 16}" width="5" height="7" fill="#ffe9a8" opacity=".8"/>`;
            });
            let rl = '';
            for (let x = 96; x < 510; x += 24)
                rl += `<rect x="${x}" y="266" width="8" height="34" rx="3" fill="#fff"/>`;
            let bu = '';
            const q = PAL[lc];
            for (let i = 0; i < 12; i++) {
                const t = i / 11, x = 90 + t * 420, y = 142 + 96 * t * (1 - t) + 3;
                bu += `<circle class="bulb twk" style="animation-delay:${(i * .27).toFixed(2)}s" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.2" fill="${q[i % 4]}"/>`;
            }
            return `<rect width="600" height="400" fill="url(#sk)"/>${stars(100, 125, 400, 110, 16)}<g id="orb"><circle r="34" opacity=".25"/><circle r="16"/></g>${cloud(150, 170, 1.3)}${cloud(330, 150, 1.1)}${cloud(450, 190, 1.2)}<path d="M0 270Q110 235 230 262T440 250T600 244V300H0Z" fill="#b9a6d6" opacity=".55"/>${sk}<rect y="298" width="600" height="110" fill="#d9b48f"/><path d="M0 322H600M0 350H600M0 378H600" stroke="#c49a73" stroke-width="2"/>${rl}<rect x="80" y="276" width="440" height="6" rx="3" fill="#fff"/><g class="obj" data-o="lights" style="cursor:pointer"><path d="M90 142Q300 190 510 142" stroke="transparent" stroke-width="24" fill="none"/><path d="M90 142Q300 190 510 142" stroke="#8a6a5a" fill="none" stroke-width="1.6"/>${bu}</g>`;
        };
        const roomSvg = r => r === 'garden' ? garden() : r === 'balcony' ? balcony() : r === 'kitchen' ? kitchen() : room(r);
        const bfly = (x, y, c, d) => `<g class="obj" data-o="bfly" transform="translate(${x} ${y})" style="cursor:pointer"><g class="fl" style="animation-delay:${d}s"><circle r="20" fill="transparent"/><g class="wg"><ellipse cx="-4.5" cy="-2" rx="5.5" ry="4" fill="${c}"/><ellipse cx="4.5" cy="-2" rx="5.5" ry="4" fill="${c}"/></g><rect x="-.8" y="-5" width="1.6" height="9" rx=".8" fill="#6b4a5a"/></g></g>`;

// ------------------------------------------------------------
// Props, objects and treats
// ------------------------------------------------------------

        function props(r) {
            if (r === 'living')
                return ob('musicbox', 142, 366, '<ellipse rx="15" ry="4" fill="#0001"/><rect x="-13" y="-16" width="26" height="16" rx="5" fill="#f6b8cf" stroke="#fff" stroke-width="2"/><ellipse cy="-16" rx="13" ry="4.5" fill="#fbd3e2" stroke="#fff" stroke-width="1.5"/><text y="-5" font-size="11" text-anchor="middle" fill="#fff">♪</text>')
                    + ob('ball', 455, 366, '<ellipse rx="10" ry="2.6" fill="#0001"/><circle cy="-9" r="9" fill="#8fd3ff" stroke="#fff" stroke-width="1.5"/><path d="M-8-9a8 8 0 0116 0" fill="none" stroke="#fff" stroke-width="2"/><circle cy="-9" r="2.5" fill="#fff" opacity=".85"/>');
            if (r === 'bedroom')
                return ob('clock', 212, 168, '<circle cy="-14" r="14" fill="#fff" stroke="#d9b48f" stroke-width="3"/><line id="ch" x1="0" y1="-14" x2="0" y2="-21" stroke="#76566b" stroke-width="2.4" stroke-linecap="round"/><line id="cm" x1="0" y1="-14" x2="0" y2="-24" stroke="#d9588a" stroke-width="1.6" stroke-linecap="round"/><circle cy="-14" r="1.8" fill="#76566b"/>', 34, 34)
                    + ob('mobile', 390, 172, '<path d="M0-52V-62M-15-50h30M-12-50v14M0-50v22M12-50v14" stroke="#c9a27a" stroke-width="1.6" fill="none"/><text x="-12" y="-33" font-size="12" text-anchor="middle">⭐</text><text y="-25" font-size="12" text-anchor="middle">🌙</text><text x="12" y="-33" font-size="12" text-anchor="middle">⭐</text>', 44, 60);
            if (r === 'kitchen')
                return ob('jar', 112, 236, '<rect x="-10" y="-22" width="20" height="22" rx="6" fill="#f9d0dc" stroke="#fff" stroke-width="2"/><rect x="-8" y="-27" width="16" height="6" rx="3" fill="#e89ab3"/><text y="-7" font-size="11" text-anchor="middle">🍪</text>')
                    + ob('kettle', 490, 236, '<path d="M-12 0v-14q0-9 12-9t12 9v14z" fill="#cfd8e6" stroke="#fff" stroke-width="2"/><path d="M12-14l9-8" stroke="#cfd8e6" stroke-width="4" stroke-linecap="round"/><path d="M-8-23q8-9 16 0" fill="none" stroke="#a9b6c9" stroke-width="3"/><circle cy="-26" r="3" fill="#e89ab3"/><text class="stm" x="20" y="-26" font-size="10">☁</text>')
                    + ob('basket', 140, 366, '<ellipse rx="20" ry="4" fill="#0001"/><text x="-12" y="-14" font-size="15">🥕</text><text x="0" y="-14" font-size="15">🥕</text><path d="M-19-14h38l-4 14h-30z" fill="#d7a36f" stroke="#b98150" stroke-width="2"/>', 44, 40);
            if (r === 'balcony')
                return ob('scope', 128, 300, '<path d="M0-18L-13 0M0-18L13 0M0-18V0" stroke="#b9936a" stroke-width="3" stroke-linecap="round" fill="none"/><g transform="rotate(-38 0 -20)"><rect x="-6" y="-46" width="12" height="32" rx="4" fill="#9fb3d9" stroke="#fff" stroke-width="1.5"/><rect x="-7.5" y="-50" width="15" height="6" rx="2" fill="#6f86bd"/></g>', 44, 58);
            if (r === 'garden')
                return bfly(170, 182, '#ffb3cf', 0) + bfly(360, 206, '#c9a6ff', -4.5) + ob('bird', 482, 292, '<rect x="-2" y="-34" width="4" height="34" fill="#b98150"/><path d="M-12-52h24v18h-24z" fill="#f6c1a0" stroke="#fff" stroke-width="2"/><path d="M-15-52L0-64l15 12z" fill="#e0847a"/><circle cy="-43" r="4" fill="#6b4a3a"/><ellipse cx="9" cy="-60" rx="6" ry="4.6" fill="#8fd3ff"/><circle cx="14" cy="-64" r="3.4" fill="#8fd3ff"/><path d="M17-64l4 1-4 1z" fill="#ffb84d"/>', 40, 70);
            return '';
        }
        const OCD = {};
        const pts = (k, v) => {
            const n = Date.now();
            if (!OCD[k] || n - OCD[k] > 8000) {
                OCD[k] = n;
                addP(v);
            }
        };
        const wob = o => {
            const g = ROOT.querySelector('.obj[data-o="' + o + '"] .ig');
            if (g) {
                g.classList.remove('wob');
                void g.getBoundingClientRect();
                g.classList.add('wob');
            }
        };
        const notes = (fs, step = 170, v = .03) => fs.forEach((f, i) => setTimeout(() => tone(f, .4, v), i * step));

        function bunnyGo(x, y, fn) {
            if (asleep) {
                pop('shh… bunny sleeps 💤', bx, by - 60);
                return;
            }
            rd = null;
            tx = x;
            ty = y;
            arr = fn;
            lastIn = Date.now();
        }

        function updClock() {
            const h = $('#ch'), m = $('#cm');
            if (!h)
                return;
            const d = new Date();
            h.setAttribute('transform', `rotate(${(d.getHours() % 12 + d.getMinutes() / 60) * 30} 0 -14)`);
            m.setAttribute('transform', `rotate(${d.getMinutes() * 6} 0 -14)`);
        }

        function shoot() {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.innerHTML = '<path d="M0 0L48 -12" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/><circle r="3.6" fill="#fff6cf"/>';
            $('#fg').appendChild(g);
            g.animate([{ transform: 'translate(480px,150px)', opacity: 0 }, { opacity: 1, offset: .15 }, { transform: 'translate(150px,240px)', opacity: 0 }], { duration: 1300, easing: 'ease-in' }).onfinish = () => g.remove();
            notes([2093, 1568, 1175, 880], 90, .02);
            pop('✨ make a wish!', 300, 170);
        }

        function spawnTreat() {
            if (treats.length >= 3) {
                pop('plenty of carrots! 🥕', 140, 335);
                return;
            }
            wake();
            const x = 190 + Math.random() * 250, y = 328 + Math.random() * 38, id = 't' + Date.now() + treats.length;
            treats.push({ x, y, id });
            $('#treats').insertAdjacentHTML('beforeend', `<text data-id="${id}" x="${x}" y="${y}" font-size="18" text-anchor="middle">🥕</text>`);
            tone(500, .08, .03, 800);
            goTreat();
        }

        function goTreat() {
            if (!treats.length || asleep || rd || drag)
                return;
            const t = treats[0];
            tx = t.x;
            ty = t.y;
            arr = () => eatTreat(t);
        }

        function eatTreat(t) {
            const i = treats.indexOf(t);
            if (i < 0)
                return;
            treats.splice(i, 1);
            const el = $('#treats [data-id="' + t.id + '"]');
            if (el)
                el.remove();
            const c = $('#crt'), b = $('#bun');
            c.style.display = '';
            b.classList.add('nib');
            tone(300, .05, .03, 200);
            setTimeout(() => tone(260, .05, .03, 180), 260);
            setTimeout(() => {
                c.style.display = 'none';
                b.classList.remove('nib');
                pop('♥ yum!', bx, by - 70);
                hop();
                tick('feed');
                addP(1);
                if (treats.length)
                    goTreat();
            }, 1500);
        }

        function cycleLights() {
            lc = (lc + 1) % PAL.length;
            $$('.bulb').forEach((e, i) => e.setAttribute('fill', PAL[lc][i % 4]));
        }

        function objTap(o, e) {
            wob(o);
            wake();
            if (o === 'musicbox') {
                notes([523, 659, 784, 1047, 784, 659, 523]);
                pop('♪ ♫ ♪', 142, 330);
                runLocalAction('dance', Math.random() < .5 ? 1 : 0);
                pts(o, 2);
            }
            else if (o === 'ball') {
                pop('boing!', 455, 330);
                tone(300, .2, .05, 600);
                bunnyGo(455, 358, () => {
                    hop();
                    pop('♥', bx, by - 60);
                });
                pts(o, 1);
            }
            else if (o === 'clock') {
                pop(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), 212, 128);
                tone(880, .1, .03);
                setTimeout(() => tone(660, .2, .03), 120);
            }
            else if (o === 'mobile') {
                notes([784, 988, 1175, 988], 140, .025);
                pop('✨', 390, 135);
                pts(o, 1);
            }
            else if (o === 'jar') {
                pop('🍪 yum!', 112, 208);
                notes([660, 880], 110);
                runLocalAction('feed', Math.random() < .5 ? 1 : 0);
                pts(o, 2);
            }
            else if (o === 'kettle') {
                pop('☁ pssst~', 488, 208);
                tone(1500, .6, .03, 2100);
                pts(o, 1);
            }
            else if (o === 'basket') {
                spawnTreat();
            }
            else if (o === 'scope') {
                shoot();
                pts(o, 3);
            }
            else if (o === 'lights') {
                cycleLights();
                notes([1047, 1319, 1568], 90, .02);
                pts(o, 1);
            }
            else if (o === 'bfly') {
                const [x, y] = vb(e);
                pop('💗', x, y);
                tone(1400, .1, .02, 1800);
                pts(o, 1);
            }
            else if (o === 'bird') {
                notes([2093, 2637, 2093, 2349], 110, .015);
                pop('tweet! 🐦', 482, 222);
                pts(o, 1);
            }
        }

        function bunnyDoor(d) {
            roomLock = Date.now() + 3500;
            const n = ROOMS.length;
            goRoom(ROOMS[(ROOMS.indexOf(st.room) + d + n) % n]);
            startRoomTimer();
            setTimeout(() => {
                bx = d > 0 ? 130 : 470;
                by = Math.max(by, 330);
                tx = null;
                dir = d > 0 ? 1 : -1;
                drawBunny();
            }, 330);
        }

// ------------------------------------------------------------
// Building a room
// ------------------------------------------------------------

        function build() {
            const r = st.room;
            (OUT(r) ? $('#fg') : $('#bg')).after($('#wx'));
            $('#bg').innerHTML = '<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop id="s1" offset="0"/><stop id="s2" offset="1"/></linearGradient><radialGradient id="lg"><stop offset="0" stop-color="#ffe9a8" stop-opacity=".75"/><stop offset="1" stop-color="#ffe9a8" stop-opacity="0"/></radialGradient></defs>' + roomSvg(r) + props(r) + edgeHints() + giftSvg();
            // Delegate room-object input from the SVG root for reliable mouse and touch hit testing.
            $('#bg').querySelectorAll('.obj,.plot').forEach(g => {
                g.style.pointerEvents = 'all';
                g.style.touchAction = 'manipulation';
                g.querySelectorAll('rect,ellipse,circle,path,text').forEach(shape => {
                    if (shape.getAttribute('fill') === 'transparent') shape.style.pointerEvents = 'all';
                });
            });
            treats.length = 0;
            {
                const tg = $('#treats');
                if (tg)
                    tg.innerHTML = '';
            }
            arr = null;
            updClock();
            const gf = $('#gift');
            if (gf)
                gf.onpointerup = e => { e.preventDefault(); e.stopPropagation(); openGift(); };
            $('#bg').onpointerup = e => {
                const target = e.target;
                const plotTarget = target.closest && target.closest('.plot');
                if (plotTarget) {
                    e.preventDefault(); e.stopPropagation();
                    tapPlot(+plotTarget.dataset.i); return;
                }
                const objectTarget = target.closest && target.closest('.obj');
                if (objectTarget) {
                    e.preventDefault(); e.stopPropagation();
                    objTap(objectTarget.dataset.o, e); return;
                }
                if (target.closest && target.closest('#gift')) {
                    e.preventDefault(); e.stopPropagation();
                    openGift(); return;
                }
                if (asleep) return;
                const r = $('#bg').getBoundingClientRect(), vx = 90 + (e.clientX - r.left) / r.width * 420, vy = 120 + (e.clientY - r.top) / r.height * 270;
                if (vy < 296) return;
                arr = null;
                tx = Math.max(112, Math.min(488, vx));
                ty = Math.max(304, Math.min(372, vy));
                lastIn = Date.now();
            };
            env();
        }

// ------------------------------------------------------------
// Bunny: movement, riding, sleeping, purring and input
// ------------------------------------------------------------

        const pop = (t, x, y) => {
            const e = document.createElement('div');
            e.className = 'pop';
            e.textContent = t;
            e.style.left = (x - 90) / 4.2 + '%';
            e.style.top = (y - 120) / 2.7 + '%';
            $('#pops').appendChild(e);
            setTimeout(() => e.remove(), 1600);
        };
        let wakeUntil = 0, tx = null, ty = null, lastIn = 0, drag = null, bl = performance.now(), ck = 0;
        const key = {}, dp = { x: 0, y: 0 };
        let rd = null;
        const HP = [[210, 186], [390, 186]], PS = .72, FLOOR_S = 1 + (350 - 304) / 68 * .35;
        const sc = () => rd ? rd.s : Math.max(1, 1 + (by - 304) / 68 * .35);
        const clampB = () => {
            bx = Math.max(112, Math.min(488, bx));
            if (drag || rd)
                by = Math.max(140, Math.min(372, by));
            else {
                if (by < 304)
                    by = Math.min(304, by + 7);
                by = Math.min(372, by);
            }
        };

        function perchHit() {
            for (let i = 0; i < 2; i++)
                if (Math.abs(bx - HP[i][0]) < 65 && by >= 140 && by <= 290)
                    return i;
            return -1;
        }

        function startRide(i) {
            wake();
            wakeUntil = Date.now() + 40000;
            tx = null;
            rd = {
                c: i, n: 0, ph: 'land', t0: performance.now(), fx: bx, fy: by, tx: HP[i][0], ty: HP[i][1], dur: 300, arc: 20, s0: sc(), s1: PS, s: sc()
            };
            pop('🐰 on my head!', HP[i][0], HP[i][1] - 50);
        }

        function rideStep(now) {
            const r = rd;
            const go = (ph, to, dur, arc, s1) => {
                r.ph = ph;
                r.t0 = now;
                r.fx = bx;
                r.fy = by;
                r.tx = to[0];
                r.ty = to[1];
                r.dur = dur;
                r.arc = arc;
                r.s0 = r.s;
                r.s1 = s1;
            };
            const u = Math.min(1, (now - r.t0) / r.dur);
            if (r.ph === 'sit') {
                bx = HP[r.c][0];
                by = HP[r.c][1];
                r.s = PS;
                if (u >= 1) {
                    if (r.n < 3) {
                        go('jump', HP[1 - r.c], 760, 24, PS);
                        hop();
                        tone(700, .12, .03, 1100);
                    }
                    else
                        go('down', [HP[r.c][0] + (r.c ? -45 : 45), 350], 900, 30, FLOOR_S);
                }
                return;
            }
            bx = r.fx + (r.tx - r.fx) * u;
            by = r.fy + (r.ty - r.fy) * u - 4 * r.arc * u * (1 - u);
            r.s = r.s0 + (r.s1 - r.s0) * u;
            if (Math.abs(r.tx - r.fx) > 1)
                dir = r.tx > r.fx ? 1 : -1;
            if (u >= 1) {
                if (r.ph === 'jump') {
                    r.c = 1 - r.c;
                    r.n++;
                    r.ph = 'sit';
                    r.t0 = now;
                    r.dur = 520;
                    pop(r.n < 3 ? '♥' : '♥ ♥ ♥', bx, by - 50);
                    tone(900, .07, .03, 1400);
                }
                else if (r.ph === 'land') {
                    r.ph = 'sit';
                    r.t0 = now;
                    r.dur = 450;
                    tone(900, .07, .03, 1400);
                }
                else {
                    rd = null;
                    tx = null;
                    lastIn = Date.now();
                    pop('wheee! 🐰', bx, by - 60);
                    tick('bunny');
                    addP(3);
                }
            }
        }

        function setSleep() {
            const n = phase() === 'night' && Date.now() > wakeUntil && !drag;
            asleep = n;
            const b = $('#bun');
            if (!b)
                return;
            b.classList.toggle('sl', n);
            $('#be').setAttribute('ry', n ? .5 : 2.3);
        }
        let bmv = false;
        const drawBunny = () => {
            const b = $('#bun');
            if (!b)
                return;
            const s = sc(), lift = bmv && !rd && !drag ? Math.abs(Math.sin(performance.now() * .011)) * 9 * s : 0;
            b.setAttribute('transform', `translate(${bx} ${by - lift}) scale(${s})`);
            $('#bf').setAttribute('transform', `scale(${dir} 1)`);
            const h = $('#bsh');
            if (h) {
                h.setAttribute('cx', bx);
                h.setAttribute('cy', by + 1);
                h.setAttribute('rx', Math.max(4, 17 * s * (1 - lift / 50)));
                h.setAttribute('opacity', rd || drag ? 0 : .2);
            }
        };

        function placeBunny() {
            setSleep();
            if (asleep && st.room === 'bedroom') {
                bx = 468;
                by = 322;
                tx = null;
            }
            drawBunny();
        }
        const hop = () => {
            const b = $('#bun');
            b.classList.remove('hop');
            void b.getBoundingClientRect();
            b.classList.add('hop');
        };

        function wake() {
            lastIn = Date.now();
            wakeUntil = Date.now() + 30000;
            if (asleep) {
                setSleep();
                pop('yawn… 🐰', bx, by - 60);
            }
        }
        let holdT = 0, purrI = 0, lastTap = 0, purrN = 0;

        function bunnyTap() {
            if (asleep) {
                wake();
                return;
            }
            const n = Date.now(), dbl = n - lastTap < 320;
            lastTap = n;
            hop();
            if (dbl) {
                setTimeout(hop, 380);
                pop('wheee! 🐰', bx, by - 70);
            }
            else
                pop('♥', bx, by - 60);
            const e = $('#be');
            e.setAttribute('ry', .6);
            setTimeout(() => e.setAttribute('ry', 2.3), 900);
            tone(1200, .08, .03, 1700);
        }

        function startPurr() {
            purrN = 0;
            $('#bun').classList.add('purr');
            $('#be').setAttribute('ry', .6);
            purrI = setInterval(() => {
                pop('♥', bx + (Math.random() - .5) * 30, by - 70);
                tone(180, .25, .02, 150);
                if (++purrN === 3)
                    tick('bunny');
            }, 520);
        }

        function stopPurr() {
            clearInterval(purrI);
            const b = $('#bun');
            if (b)
                b.classList.remove('purr');
            const e = $('#be');
            if (e && !asleep)
                e.setAttribute('ry', 2.3);
        }

        function bunLoop(now) {
            requestAnimationFrame(bunLoop);
            const dt = Math.min(.05, (now - bl) / 1e3);
            bl = now;
            if (!$('#bun'))
                return;
            if (now - ck > 500) {
                ck = now;
                const was = asleep;
                setSleep();
                if (asleep && !was && st.room === 'bedroom') {
                    bx = 468;
                    by = 322;
                    tx = null;
                }
            }
            const ix = (key.ArrowRight || key.KeyD ? 1 : 0) - (key.ArrowLeft || key.KeyA ? 1 : 0) + dp.x, iy = (key.ArrowDown || key.KeyS ? 1 : 0) - (key.ArrowUp || key.KeyW ? 1 : 0) + dp.y;
            let mv = false;
            if (!rd && (ix || iy)) {
                wake();
                tx = null;
                const m = Math.hypot(ix, iy);
                bx += ix / m * 110 * dt;
                by += iy / m * 62 * dt;
                mv = true;
                if (ix)
                    dir = ix > 0 ? 1 : -1;
            }
            else if (tx !== null && !asleep && !drag && !rd) {
                const dx = tx - bx, dy = ty - by, d = Math.hypot(dx, dy);
                if (d < 3) {
                    tx = null;
                    if (arr) {
                        const f = arr;
                        arr = null;
                        f();
                    }
                }
                else {
                    const s = Math.min(d, 125 * dt);
                    bx += dx / d * s;
                    by += dy / d * s;
                    dir = dx > 0 ? 1 : -1;
                    mv = true;
                }
            }
            if (rd)
                rideStep(now);
            clampB();
            bmv = mv;
            $('#bun').classList.toggle('walk', mv);
            drawBunny();
            if (!rd && !drag && !asleep && Date.now() > roomLock && (bx <= 117 || bx >= 483))
                bunnyDoor(bx <= 117 ? -1 : 1);
            if (!asleep && !rd && !drag && by >= 300) {
                if (st.room === 'garden')
                    for (let i = 0; i < 4; i++)
                        if (st.plots[i] === 4 && Math.abs(bx - (150 + i * 100)) < 26 && Math.abs(by - 352) < 20)
                            tapPlot(i);
                if (st.gift && Math.abs(bx - 300) < 24 && Math.abs(by - 368) < 14)
                    openGift();
            }
        }
        addEventListener('keydown', e => {
            if (!ROOT.getClientRects().length)
                return;
            if (e.target.matches && e.target.matches('input,textarea'))
                return;
            key[e.code] = 1;
            if (e.code.startsWith('Arrow') || e.code === 'Space')
                e.preventDefault();
            if (e.code === 'Space' && !asleep)
                hop();
        });
        addEventListener('keyup', e => {
            delete key[e.code];
        });
        const DIR = {
            up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0]
        };
        $$('.dp button').forEach(b => {
            const s = e => {
                e.preventDefault();
                [dp.x, dp.y] = DIR[b.dataset.d];
            }, r = () => {
                dp.x = 0;
                dp.y = 0;
            };
            b.onpointerdown = s;
            b.onpointerup = r;
            b.onpointerleave = r;
            b.onpointercancel = r;
        });
        const vb = e => {
            const r = $('#fg').getBoundingClientRect();
            return [90 + (e.clientX - r.left) / r.width * 420, 120 + (e.clientY - r.top) / r.height * 270];
        };
        $('#fg').addEventListener('contextmenu', e => e.preventDefault());
        $('#fg').addEventListener('pointerdown', e => {
            if (!e.target.closest('#bun'))
                return;
            e.preventDefault();
            const [x, y] = vb(e);
            drag = {
                ox: bx - x, oy: by - y, sx: e.clientX, sy: e.clientY, m: 0, hold: 0
            };
            rd = null;
            tx = null;
            wake();
            clearTimeout(holdT);
            holdT = setTimeout(() => {
                if (drag && !drag.m && !asleep) {
                    drag.hold = 1;
                    startPurr();
                }
            }, 450);
        });
        addEventListener('pointermove', e => {
            if (!drag)
                return;
            if (!drag.m && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) {
                drag.m = 1;
                clearTimeout(holdT);
                if (drag.hold) {
                    drag.hold = 0;
                    stopPurr();
                }
            }
            if (drag.m) {
                const [x, y] = vb(e), nx = x + drag.ox;
                dir = nx > bx ? 1 : -1;
                bx = nx;
                by = y + drag.oy;
                clampB();
                wake();
            }
        });
        const endTouch = () => {
            clearTimeout(holdT);
            if (!drag)
                return;
            const d = drag;
            drag = null;
            if (d.hold) {
                stopPurr();
                pop('♥', bx, by - 60);
                hop();
            }
            else if (d.m) {
                const h = perchHit();
                if (h >= 0)
                    startRide(h);
                else
                    hop();
            }
            else
                bunnyTap();
        };
        addEventListener('pointerup', endTouch);
        addEventListener('pointercancel', endTouch);
        setInterval(() => {
            if (asleep || document.hidden || drag || rd || Date.now() - lastIn < 7000 || tx !== null)
                return;
            if (treats.length) {
                goTreat();
                return;
            }
            tx = 130 + Math.random() * 340;
            ty = 310 + Math.random() * 58;
            hop();
        }, 5200);
        requestAnimationFrame(bunLoop);

// ------------------------------------------------------------
// Environment
// ------------------------------------------------------------

        function env() {
            const p = phase(), n = p === 'night', base = SKY[p], tg = st.wx === 'rain' ? '#8d98a8' : st.wx === 'snow' ? '#dfe6f0' : null, c = tg ? base.map(x => mix(x, tg, n ? .35 : .6)) : base;
            const s1 = $('#s1');
            if (s1) {
                s1.setAttribute('stop-color', c[0]);
                $('#s2').setAttribute('stop-color', c[1]);
            }
            const stt = $('#stars');
            if (stt)
                stt.style.opacity = n && st.wx === 'clear' ? 1 : 0;
            const o = $('#orb');
            if (o) {
                const f = {
                    morning: [.2, .62], afternoon: [.5, .3], evening: [.8, .6], night: [.62, .34]
                }[p];
                o.setAttribute('transform', `translate(${ORB.x + ORB.w * f[0]} ${ORB.y + ORB.h * f[1]})`);
                o.querySelectorAll('circle').forEach(e => e.setAttribute('fill', n ? '#fff6cf' : p === 'evening' ? '#ff9a5c' : '#ffd45e'));
                o.style.opacity = st.wx === 'clear' ? 1 : .2;
            }
            $$('.cl').forEach(e => {
                e.style.opacity = st.wx === 'clear' ? 0 : .92;
                e.setAttribute('fill', st.wx === 'rain' ? '#aeb7c4' : '#fff');
            });
            $('#tint').style.background = 'transparent';
            const g = $('#glow');
            if (g)
                g.style.opacity = n || p === 'evening' ? 1 : 0;
            placeBunny();
            amb();
            updClock();
        }
        let lastBy = 1;
        const cd = {};

// ------------------------------------------------------------
// Bear actions (public API)
// ------------------------------------------------------------

        function bears(a, by = 0) {
            runLocalAction(a, by);
        }

        function runLocalAction(action, by = 0) {
            if (!engine || !ACTION_MAP[action])
                return false;
            engine.play(action, by === 1 ? 1 : 0);
            lastAct = action;
            clearTimeout(rtT);
            if (['dance', 'pet', 'hands'].includes(action))
                rtT = setTimeout(() => {
                    if (lastAct === action) {
                        engine.play('idle', 0);
                        lastAct = 'idle';
                    }
                }, 9000);
            if (action === 'hug')
                tick('hug');
            if (action === 'feed')
                tick('feed');
            if (action === 'kiss' || action === 'flykiss')
                tick('kiss');
            if (!asleep && ['hug', 'kiss', 'flykiss', 'feed', 'hands'].includes(action))
                setTimeout(() => {
                    hop();
                    pop('♥', bx, by - 60);
                }, 900);
            if (!asleep && action === 'dance') {
                [0, 420, 840].forEach(d => setTimeout(hop, d));
                pop('♪', bx, by - 60);
            }
            return true;
        }

        function triggerBearAction(action, options = {}) {
            if (!ACTION_MAP[action])
                return false;
            const by = options.by === 0 || options.by === 1 ? options.by : (lastBy = 1 - lastBy);
            runLocalAction(action, by);
            if (!options.remote) {
                const n = Date.now();
                if (!cd[action] || n - cd[action] > 4000) {
                    cd[action] = n;
                    addP(action === 'idle' ? 1 : 2);
                }
                window.dispatchEvent(new CustomEvent('bearfriend:action', { detail: { action, by, at: n } }));
            }
            const bt = $('#acts [data-a="' + action + '"]');
            if (bt) {
                bt.setAttribute('aria-pressed', 'true');
                setTimeout(() => bt.setAttribute('aria-pressed', 'false'), 1400);
            }
            return true;
        }
        addEventListener('bearfriend:remote', e => triggerBearAction(e.detail.action, { by: e.detail.by, remote: true }));

        function auto() {
            const night = ['evening', 'night'].includes(phase());
            let a = 'idle';
            if (st.room === 'bedroom' && night)
                a = 'sleep';
            else if (st.room === 'kitchen')
                a = 'feed';
            else if (st.room === 'balcony' && night)
                a = 'hands';
            engine.play(a, 0);
            lastAct = a;
        }

// ------------------------------------------------------------
// Garden plots and the weather canvas
// ------------------------------------------------------------

        function tapPlot(i) {
            const s = st.plots[i], x = 150 + i * 100;
            if (!s) {
                st.plots[i] = 1;
                st.rare[i] = 0;
                pop('🌱 planted', x, 318);
                plot(i);
            }
            else if (s === 4) {
                const r = st.rare[i];
                st.petals += r ? 5 : 1;
                pop(r ? '✨ rare! +5' : '+1 🌸', x, 296);
                st.plots[i] = 0;
                st.rare[i] = 0;
                plot(i);
                carePaint();
                if (!asleep)
                    hop();
            }
            else {
                tick('water');
                pop('💧', x, 300);
                tone(700, .12, .03, 500);
                setTimeout(() => {
                    st.plots[i] = s + 1;
                    if (s + 1 === 4)
                        st.rare[i] = Math.random() < .25 ? 1 : 0;
                    plot(i);
                }, 380);
            }
        }
        const plot = i => {
            const e = $('#pl' + i);
            if (e)
                e.innerHTML = plant(i);
        };
        const cv = $('#wx'), cx = cv.getContext('2d');
        let PT = [];

        function loop() {
            requestAnimationFrame(loop);
            const r = cv.getBoundingClientRect(), d = devicePixelRatio || 1;
            if (cv.width !== Math.round(r.width * d)) {
                cv.width = Math.round(r.width * d);
                cv.height = Math.round(r.height * d);
            }
            cx.clearRect(0, 0, cv.width, cv.height);
            const sea = seasonOf(), leaf = st.wx === 'clear' && OUT(st.room) && (sea === 'spring' || sea === 'autumn');
            if (st.wx === 'clear' && !leaf)
                return;
            const W = cv.width, k = W / 420, ind = !OUT(st.room), rg = ind ? [(258 - 90) * k, (155 - 120) * k, 84 * k, 80 * k] : [0, 0, W, cv.height], snow = st.wx === 'snow' || leaf;
            while (PT.length < (ind ? 36 : 120))
                PT.push({ x: Math.random(), y: Math.random(), v: .5 + Math.random() * .7 });
            cx.save();
            cx.beginPath();
            cx.rect(...rg);
            cx.clip();
            cx.strokeStyle = 'rgba(120,150,200,.7)';
            cx.fillStyle = leaf ? (sea === 'spring' ? '#ffb3cf' : '#e8893a') : '#fff';
            for (const q of leaf ? PT.slice(0, 30) : PT) {
                q.y += q.v * (snow ? .004 : .02);
                q.x += snow ? Math.sin(q.y * 9 + q.v * 5) * .0015 : -.003;
                if (q.y > 1) {
                    q.y = 0;
                    q.x = Math.random();
                }
                if (q.x < 0)
                    q.x = 1;
                const x = rg[0] + q.x * rg[2], y = rg[1] + q.y * rg[3];
                if (leaf) {
                    cx.beginPath();
                    cx.ellipse(x, y, 3.2 * k, 1.7 * k, q.y * 9, 0, 7);
                    cx.fill();
                }
                else if (snow) {
                    cx.beginPath();
                    cx.arc(x, y, (1 + q.v * 1.5) * k * .6, 0, 7);
                    cx.fill();
                }
                else {
                    cx.beginPath();
                    cx.moveTo(x, y);
                    cx.lineTo(x - 2 * k, y + 8 * k);
                    cx.stroke();
                }
            }
            cx.restore();
        }
        loop();

// ------------------------------------------------------------
// Sound
// ------------------------------------------------------------

        let ac, nb, amT;
        const A = () => {
            if (!ac) {
                ac = new (window.AudioContext || window.webkitAudioContext)();
                nb = ac.createBuffer(1, ac.sampleRate * 1.2, ac.sampleRate);
                const d = nb.getChannelData(0);
                for (let i = 0; i < d.length; i++)
                    d[i] = Math.random() * 2 - 1;
            }
            ac.resume();
            return ac;
        };

        function tone(f, d, v, g) {
            if (!st.snd)
                return;
            const c = A(), t = c.currentTime, o = c.createOscillator(), n = c.createGain();
            o.frequency.setValueAtTime(f, t);
            if (g)
                o.frequency.exponentialRampToValueAtTime(g, t + d);
            n.gain.setValueAtTime(.0001, t);
            n.gain.exponentialRampToValueAtTime(v, t + .02);
            n.gain.exponentialRampToValueAtTime(.0001, t + d);
            o.connect(n);
            n.connect(c.destination);
            o.start(t);
            o.stop(t + d + .05);
        }

        function wind(fr, v, d) {
            const c = A(), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
            s.buffer = nb;
            f.type = fr > 800 ? 'bandpass' : 'lowpass';
            f.frequency.value = fr;
            g.gain.value = v;
            s.connect(f);
            f.connect(g);
            g.connect(c.destination);
            s.start();
            s.stop(c.currentTime + d);
        }

        function amb() {
            clearInterval(amT);
            if (!st.snd)
                return;
            amT = setInterval(() => {
                const p = phase();
                if (st.wx === 'rain') {
                    // Soft, low-volume rain texture rather than a sharp hiss.
                    wind(1050, .006, 1.25);
                    if (Math.random() < .35) tone(180 + Math.random() * 90, .025, .004);
                }
                else if (st.wx === 'snow') {
                    // Quiet, low-frequency winter breeze.
                    wind(420, .004, 1.5);
                }
                else if (p === 'night') {
                    // Clear-night crickets, not bird chirps.
                    tone(3900, .035, .003);
                    setTimeout(() => tone(4100, .035, .003), 180);
                }
                else if (Math.random() < .5) {
                    // Short, gentle daytime bird calls for clear weather.
                    const f = 1900 + Math.random() * 650;
                    tone(f, .075, .006, f * 1.18);
                    setTimeout(() => tone(f * 1.12, .08, .005, f * .92), 125);
                }
            }, 1000);
        }

// ------------------------------------------------------------
// Care points, tasks and progress
// ------------------------------------------------------------

        const ACTION_LIST = [
            ['hug', '🫂', 'Hug'], ['kiss', '💋', 'Kiss'], ['flykiss', '😘', 'Flying kiss'], ['slap', '🖐️', 'Playful slap'], ['hands', '🤝', 'Hold hands'], ['dance', '💃', 'Dance'], ['pet', '🐾', 'Pet'], ['tummy', '🫳', 'Scratch tummy'], ['feed', '🍓', 'Feed'], ['sleep', '🌙', 'Sleep'], ['idle', '🌸', 'Relax']
        ];
        const ACTION_MAP = Object.fromEntries(ACTION_LIST.map(a => [a[0], a]));
        const addP = n => {
            st.petals += n;
            carePaint();
        };
        const put = (s, f) => {
            const e = $(s);
            if (e)
                f(e);
        };
        const emitProgress = () => {
            const p = st.petals, l = Math.floor(p / 100);
            ROOT.dispatchEvent(new CustomEvent('bearfriend:progress', { bubbles: true, detail: {
                    points: p, level: l + 1, toNext: 100 - p % 100, nextTreasure: TREAS[l % TREAS.length], tasks: { ...st.tasks }, tasksDone: TK.filter(([k, , n]) => st.tasks[k] >= n).length, tasksTotal: TK.length
                } }));
        };

        function tasks() {
            put('#tasks', e => e.innerHTML = TK.map(([k, l, n]) => `<div class="tk${st.tasks[k] >= n ? ' ok' : ''}"><span>${st.tasks[k] >= n ? '✅' : '⬜'} ${l}</span><b>${Math.min(st.tasks[k], n)}/${n}</b></div>`).join(''));
            const d = TK.filter(([k, , n]) => st.tasks[k] >= n).length;
            put('#pg', e => e.style.width = d / TK.length * 100 + '%');
            put('#pgt', e => e.textContent = d + '/' + TK.length);
            save();
            emitProgress();
        }

        function tick(k) {
            const n = TK.find(x => x[0] === k)[2];
            if (st.tasks[k] >= n)
                return;
            st.tasks[k]++;
            if (st.tasks[k] >= n) {
                addP(3);
                pop('Task done! +3 🌸', 300, 175);
            }
            if (TK.every(([a, , m]) => st.tasks[a] >= m) && !st.bonus) {
                st.bonus = 1;
                addP(10);
                setTimeout(() => pop('All done today! +10 🌸 ✨', 300, 140), 900);
            }
            tasks();
        }

// ------------------------------------------------------------
// Rooms, gifts, weather timers, save / load
// ------------------------------------------------------------

        function goRoom(r) {
            const b = $('#bg');
            b.style.transition = 'opacity .25s';
            b.style.opacity = 0;
            setTimeout(() => {
                st.room = r;
                build();
                auto();
                b.style.opacity = 1;
                pop(RN[r], 300, 150);
            }, 260);
        }

        function feedBunny() {
            if (asleep) {
                pop('shh, bunny is sleeping 💤', bx, by - 60);
                return;
            }
            const c = $('#crt'), b = $('#bun');
            if (!c || b.classList.contains('nib'))
                return;
            c.style.display = '';
            b.classList.add('nib');
            tone(300, .05, .03, 200);
            setTimeout(() => {
                c.style.display = 'none';
                b.classList.remove('nib');
                pop('♥', bx, by - 60);
                hop();
                tick('feed');
            }, 2800);
        }

        function openGift() {
            const t = st.gift;
            if (!t)
                return;
            st.gift = null;
            const g = $('#gift');
            g && g.remove();
            [0, 1, 2].forEach(i => setTimeout(() => pop('💖', 270 + i * 30, 330), i * 160));
            pop({ rose: '🌹 A rose for you!', berries: '🍓 Fresh berries!', note: '💌 Thinking of you' }[t], 300, 300);
            addP(2);
            tick('open');
        }
        const ROOMS = ['living', 'kitchen', 'bedroom', 'balcony', 'garden'], RN = {
            living: '🛋️ Living room', kitchen: '🍪 Kitchen', bedroom: '🛏️ Bedroom', balcony: '🌙 Balcony', garden: '🌷 Garden'
        }, WN = { clear: '☀️ Clear skies', rain: '🌧️ Rain', snow: '❄️ Snow' };
        let roomT, wxT;

        function startRoomTimer() {
            clearInterval(roomT);
            roomT = setInterval(() => goRoom(ROOMS[(ROOMS.indexOf(st.room) + 1) % ROOMS.length]), 5 * 60e3);
        }

        function pickWx(init) {
            const s = seasonOf(), pool = [['clear', 5], ['rain', s === 'winter' ? 1 : 3]];
            if (s === 'winter')
                pool.push(['snow', 4]);
            const p = init ? pool : pool.filter(x => x[0] !== st.wx);
            let r = Math.random() * p.reduce((a, x) => a + x[1], 0);
            for (const x of p) {
                if ((r -= x[1]) < 0)
                    return x[0];
            }
            return p[0][0];
        }

        function startWxTimer() {
            clearInterval(wxT);
            wxT = setInterval(() => {
                st.wx = pickWx();
                env();
                pop(WN[st.wx], 300, 150);
            }, 3 * 60e3);
        }
        $('#fg').innerHTML = bunnySvg();
        engine = createBearfriendHomeEngine($('#bsvg'));
        $('#bsvg').onclick = e => {
            const g = e.target.closest('g[id^="s"]');
            if (!g || !/^s[01]$/.test(g.id))
                return;
            triggerBearAction(['pet', 'hug', 'tummy', 'dance', 'kiss'][Math.floor(Math.random() * 5)], { by: +g.id[1] });
        };
        engine.setSound(false);
        addEventListener('pointerdown', () => {
            st.snd = true;
            engine.setSound(true);
        }, { once: true, capture: true });
        for (const n of [...$('#bsvg').children]) {
            if (n.id === 'bears')
                break;
            if (n.tagName !== 'defs' && n.id !== 'pil')
                n.remove();
        }
        const TREAS = ['Cloverlight Meadow', 'Moonpetal Pond', 'Starberry Grove', 'Honeydew Hill', 'Rainbow Orchard'];

        function save() {
            try {
                localStorage.setItem('bf-home-v2', JSON.stringify({
                    petals: st.petals, day: new Date().toDateString(), tasks: st.tasks, bonus: st.bonus
                }));
            }
            catch { }
        }

        function loadSave() {
            try {
                const sv = JSON.parse(localStorage.getItem('bf-home-v2') || '{}');
                st.petals = sv.petals || 0;
                if (sv.day === new Date().toDateString()) {
                    Object.assign(st.tasks, sv.tasks || {});
                    st.bonus = sv.bonus || 0;
                }
            }
            catch { }
        }

        function carePaint() {
            const p = st.petals, l = Math.floor(p / 100), r = p % 100;
            put('#cp', e => e.textContent = p);
            put('#lv', e => e.textContent = l + 1);
            put('#cbar', e => e.style.width = r + '%');
            put('#cpt', e => e.textContent = p + ' Care Points');
            put('#cto', e => e.textContent = (100 - r) + ' to next treasure');
            put('#cn', e => e.textContent = TREAS[l % TREAS.length]);
            put('#cleft', e => e.textContent = (100 - r) + ' points left');
            save();
            emitProgress();
        }
        const seen = [0, 1, 2, 3].map(() => ({ s: -1, t: Date.now() }));
        setInterval(() => {
            const n = Date.now(), f = (st.wx === 'rain' ? .5 : 1) * (seasonOf() === 'winter' ? 1.5 : 1);
            for (let i = 0; i < 4; i++) {
                const s = st.plots[i], q = seen[i];
                if (q.s !== s) {
                    q.s = s;
                    q.t = n;
                    continue;
                }
                if (s === 4)
                    continue;
                if (n - q.t > (s === 0 ? 7000 : 16000) * f) {
                    if (s === 0) {
                        st.plots[i] = 1;
                        st.rare[i] = 0;
                    }
                    else {
                        st.plots[i] = s + 1;
                        if (s + 1 === 4)
                            st.rare[i] = Math.random() < .25 ? 1 : 0;
                    }
                    plot(i);
                }
            }
        }, 1000);
        let lastPh = phase();
        setInterval(() => {
            const p = phase();
            if (p !== lastPh) {
                lastPh = p;
                auto();
            }
            env();
        }, 30000);
        let swp = null;
        $('#scene').addEventListener('pointerdown', e => {
            if (e.target.closest('#bun'))
                return;
            swp = { x: e.clientX, y: e.clientY };
        });
        addEventListener('pointerup', e => {
            if (!swp)
                return;
            const dx = e.clientX - swp.x, dy = e.clientY - swp.y;
            swp = null;
            if (Math.abs(dx) > 60 && Math.abs(dy) < 45) {
                goRoom(ROOMS[(ROOMS.indexOf(st.room) + (dx < 0 ? 1 : ROOMS.length - 1)) % ROOMS.length]);
                startRoomTimer();
            }
        });
        setInterval(() => {
            sOff++;
            st.wx = pickWx(true);
            build();
            auto();
            pop(SN[seasonOf()], 300, 150);
        }, 6 * 60e3);
        loadSave();
        st.wx = pickWx(true);
        build();
        auto();
        startRoomTimer();
        startWxTimer();
        tasks();
        carePaint();
        const api = {
            triggerBearAction, runLocalAction, createBearPoseEngine: createBearfriendHomeEngine,
            setScene: (r, t, w) => {
                st.room = r;
                st.time = t;
                st.wx = w;
                build();
                auto();
            }
        };
        api.destroy = () => {
            _dead = true;
            _ints.forEach(id => window.clearInterval(id));
            _lis.forEach(([t, f, o]) => window.removeEventListener(t, f, o));
            try { engine && engine.destroy && engine.destroy(); } catch (e) { }
            delete ROOT.__bfh;
        };
        ROOT.__bfh = api;
        return api;
    }
    const BH = window.BearfriendHome = window.BearfriendHome || {};
    BH.createBearPoseEngine = createBearfriendHomeEngine;
    BH.triggerBearAction = () => false;
    BH.runLocalAction = () => false;
    BH.mount = root => Object.assign(BH, mountBearfriendHome(root));
    BH.unmount = root => { const a = (root || document.querySelector('[data-bearfriend-home]') || {}).__bfh; if (a) a.destroy(); BH.triggerBearAction = () => false; BH.runLocalAction = () => false; };
    const boot = () => {
        const root = document.querySelector('[data-bearfriend-home]');
        if (root)
            BH.mount(root);
    };
    document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', boot) : boot();
})();