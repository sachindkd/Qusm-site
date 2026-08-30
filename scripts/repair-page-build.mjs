import { readFileSync, writeFileSync } from "node:fs";

const path = "app/page.tsx";
let source = readFileSync(path, "utf8");

const broken = 'className="hero-caption"><span>FORT BLISS</span><strong>MILITARY ROLEPLAY</strong><span>COMMAND // COMMUNITY // OPERATIONS</span></div></motion.div><div className="scroll-cue">';
const expected = broken;

// The hero-card-wrap must close after the hero-card, before the scroll cue.
const marker = '<div className="scroll-cue"><ArrowDown size={13} /> SCROLL TO ENTER</div></section>';
const cardEnd = '</div><div className="scroll-cue"><ArrowDown size={13} /> SCROLL TO ENTER</div></section>';
const fixedCardEnd = '</div></motion.div><div className="scroll-cue"><ArrowDown size={13} /> SCROLL TO ENTER</div></section>';

if (source.includes(cardEnd) && !source.includes(fixedCardEnd)) {
  source = source.replace(cardEnd, fixedCardEnd);
  writeFileSync(path, source);
  console.log("Repaired hero-card-wrap closing tag in app/page.tsx");
} else {
  console.log("Hero JSX already repaired or marker not found; leaving source unchanged.");
}
