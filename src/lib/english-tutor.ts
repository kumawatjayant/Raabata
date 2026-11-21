export interface TutorCorrection {
  original: string;
  better: string;
  tip: string;
}

export interface TutorTurn {
  id: string;
  role: "tutor" | "user";
  text: string;
  correction?: TutorCorrection;
  timestamp: string;
}

export interface TutorReplyResult {
  reply: string;
  correction?: TutorCorrection;
}

export const ENGLISH_TUTOR_WELCOME =
  "Hey! I'm your English speaking buddy at Rabata. Talk to me like a friend about your day, hobbies, studies, or anything on your mind — I'll chat back with you and gently point out better ways to phrase things when needed.";

export const ENGLISH_TUTOR_SYSTEM_PROMPT = `You are a warm, friendly English speaking partner for learners at Rabata (an Indian community education initiative).

# How to behave
- Act like a supportive, approachable friend, NOT a strict classroom teacher or formal bot.
- Talk naturally about WHATEVER topic the learner brings up (their day, hobbies, cricket, movies, family, school, interviews, travel, food, dreams). Follow their lead!
- Keep replies concise and natural (2-3 short spoken-style sentences), ending with one easy, engaging follow-up question to keep the conversation flowing.
- Gently correct noticeable grammar, tense, or phrasing mistakes without making them feel embarrassed ("A small tip: instead of '...', try saying '...'"). If their English was already clear and natural, don't force a correction — just keep chatting!

# Output Format
Respond ONLY with valid JSON (no markdown fences):
{
  "reply": "Your warm, natural friend response with a follow-up question",
  "correction": {
    "original": "exact short phrase that had a mistake",
    "better": "natural corrected phrase",
    "tip": "brief 1-sentence friendly explanation"
  }
}
Set "correction" to null if the user's message had no meaningful grammar/phrasing mistake.`;

const IRREGULAR_BASE: Record<string, string> = {
  went: "go",
  ate: "eat",
  saw: "see",
  came: "come",
  did: "do",
  spoke: "speak",
  told: "tell",
  took: "take",
  wrote: "write",
  made: "make",
  bought: "buy",
  got: "get",
};

const UNCOUNTABLE_MAP: Record<string, string> = {
  peoples: "people",
  childrens: "children",
  informations: "information",
  advices: "advice",
  hairs: "hair",
  furnitures: "furniture",
};

const GENERIC_TOPIC_STOPWORDS = new Set([
  "about",
  "after",
  "again",
  "always",
  "because",
  "before",
  "being",
  "could",
  "every",
  "first",
  "going",
  "great",
  "have",
  "hello",
  "just",
  "like",
  "little",
  "maybe",
  "never",
  "other",
  "please",
  "really",
  "right",
  "should",
  "something",
  "still",
  "that",
  "their",
  "there",
  "these",
  "thing",
  "things",
  "think",
  "this",
  "today",
  "very",
  "want",
  "wanted",
  "what",
  "when",
  "where",
  "which",
  "with",
  "would",
  "your",
]);

export function detectEnglishCorrection(text: string): TutorCorrection | undefined {
  const clean = text.trim();
  if (!clean || clean.length < 4) return undefined;

  const myselfMatch = clean.match(/\bmyself\s+(?:is\s+)?([A-Za-z][A-Za-z'.-]{1,24})\b/i);
  if (myselfMatch?.[1]) {
    const rawName = myselfMatch[1];
    const capName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    return {
      original: myselfMatch[0],
      better: `My name is ${capName}`,
      tip: 'Use "My name is…" or "I\'m…" instead of "Myself…" when introducing yourself.',
    };
  }

  const didntMatch = clean.match(
    /\b(did\s+not|didn't)\s+(went|ate|saw|came|did|spoke|told|took|wrote|made|bought|got)\b/i,
  );
  if (didntMatch?.[2]) {
    const base = IRREGULAR_BASE[didntMatch[2].toLowerCase()] ?? didntMatch[2].toLowerCase();
    return {
      original: didntMatch[0],
      better: `didn't ${base}`,
      tip: `After "didn't", use the base form of the verb ("${base}"), not the past tense.`,
    };
  }

  const heDontMatch = clean.match(
    /\b(he|she|it|my\s+(?:friend|brother|sister|father|mother|teacher))\s+don't\b/i,
  );
  if (heDontMatch?.[1]) {
    return {
      original: heDontMatch[0],
      better: `${heDontMatch[1]} doesn't`,
      tip: 'Use "doesn\'t" with he, she, it, or one person.',
    };
  }

  const pastContinuousYesterday = clean.match(
    /\b(i\s+am\s+going|i\s+go|i\s+am\s+go)\b([^.!?]*)\b(yesterday|last\s+(?:night|week|month|year|sunday|monday|tuesday|wednesday|thursday|friday|saturday))\b/i,
  );
  if (pastContinuousYesterday) {
    const middle = (pastContinuousYesterday[2] ?? "").replace(/\s+/g, " ");
    const timeRef = pastContinuousYesterday[3] ?? "yesterday";
    return {
      original: pastContinuousYesterday[0],
      better: `I went${middle} ${timeRef}`.replace(/\s+/g, " ").trim(),
      tip: `Because you mentioned "${timeRef}", use the past tense ("I went") instead of "I am going".`,
    };
  }

  const agreeMatch = clean.match(/\bi\s+am\s+(not\s+)?agree(?:ing)?\b/i);
  if (agreeMatch) {
    return {
      original: agreeMatch[0],
      better: agreeMatch[1] ? "I don't agree" : "I agree",
      tip: '"Agree" is already an action verb, so say "I agree" instead of "I am agree".',
    };
  }

  const liveMatch = clean.match(/\bi\s+am\s+(live|stay)\s+in\b/i);
  if (liveMatch?.[1]) {
    return {
      original: liveMatch[0],
      better: `I ${liveMatch[1].toLowerCase()} in`,
      tip: 'Use simple present ("I live in…") when talking about where you stay or live.',
    };
  }

  const havingMatch = clean.match(
    /\bi\s+am\s+having\s+(a\s+(?:brother|sister|car|bike|phone|laptop|doubt|question|problem|idea|friend))\b/i,
  );
  if (havingMatch?.[1]) {
    return {
      original: havingMatch[0],
      better: `I have ${havingMatch[1]}`,
      tip: 'Say "I have…" instead of "I am having…" for possessions, family, or questions.',
    };
  }

  const doubleCompMatch = clean.match(/\bmore\s+(better|easier|faster|bigger|nicer|harder)\b/i);
  if (doubleCompMatch?.[1]) {
    return {
      original: doubleCompMatch[0],
      better: `much ${doubleCompMatch[1].toLowerCase()}`,
      tip: `Words like "${doubleCompMatch[1].toLowerCase()}" already compare two things, so use "much" instead of "more".`,
    };
  }

  const revertMatch = clean.match(/\b(revert|return|repeat)\s+(back|again)\b/i);
  if (revertMatch?.[1]) {
    const verb = revertMatch[1].toLowerCase();
    const better = verb === "revert" ? "reply" : verb;
    return {
      original: revertMatch[0],
      better,
      tip: `"${verb}" already carries that meaning, so no need to add "${revertMatch[2]}".`,
    };
  }

  const discussMatch = clean.match(/\b(discuss(?:ing|ed)?)\s+about\b/i);
  if (discussMatch?.[1]) {
    return {
      original: discussMatch[0],
      better: discussMatch[1],
      tip: '"Discuss" doesn\'t need "about" — say "Let\'s discuss this topic".',
    };
  }

  const explainMatch = clean.match(/\bexplain\s+me\b/i);
  if (explainMatch) {
    return {
      original: explainMatch[0],
      better: "explain to me",
      tip: 'Always include "to" after explain: "Can you explain to me…?"',
    };
  }

  const thirdPersonMatch = clean.match(
    /(?:^|[.!?,]\s*|and\s+|so\s+|because\s+)(he|she|it)\s+(go|come|want|like|need|speak|work|live)\b/i,
  );
  if (thirdPersonMatch?.[1] && thirdPersonMatch[2]) {
    const subj = thirdPersonMatch[1];
    const verb = thirdPersonMatch[2].toLowerCase();
    const fixedVerb = verb === "go" ? "goes" : `${verb}s`;
    return {
      original: `${subj} ${thirdPersonMatch[2]}`,
      better: `${subj} ${fixedVerb}`,
      tip: `With "${subj.toLowerCase()}", add -s/-es to the verb ("${subj} ${fixedVerb}").`,
    };
  }

  const nounMatch = clean.match(/\b(peoples|childrens|informations|advices|hairs|furnitures)\b/i);
  if (nounMatch?.[1]) {
    const replacement = UNCOUNTABLE_MAP[nounMatch[1].toLowerCase()];
    if (replacement) {
      return {
        original: nounMatch[1],
        better: replacement,
        tip: `"${replacement.charAt(0).toUpperCase() + replacement.slice(1)}" doesn't need an extra "s" at the end.`,
      };
    }
  }

  return undefined;
}

function pickVariant(options: string[], seed: number): string {
  return options[seed % options.length] ?? options[0] ?? "";
}

export function generateEnglishTutorReply(
  userText: string,
  history: TutorTurn[],
): TutorReplyResult {
  const trimmed = userText.trim();
  const lower = trimmed.toLowerCase();
  const correction = detectEnglishCorrection(trimmed);
  const userTurnCount = history.filter((t) => t.role === "user").length;

  let reply = "";

  if (
    /^(hi|hello|hey|namaste|good morning|good afternoon|good evening)\b/i.test(lower) &&
    trimmed.length < 40
  ) {
    reply = pickVariant(
      [
        "Hey! Nice to chat with you! How has your day been going so far?",
        "Hello! Glad you stopped by to practice. What have you been up to today?",
        "Hi there! Ready whenever you are — tell me something interesting from your day or pick any topic you feel like talking about!",
      ],
      userTurnCount,
    );
  } else if (/(how are you|how r u|how's it going|what's up|how are things)/i.test(lower)) {
    reply = pickVariant(
      [
        "I'm doing great, thanks for asking! What about you — anything exciting happening today?",
        "All good on my side! Tell me, what's the best thing that happened in your week so far?",
      ],
      userTurnCount,
    );
  } else if (
    /(nervous|hesitant|shy|afraid|scared|weak in english|bad at english|can't speak)/i.test(lower)
  ) {
    reply =
      "Honestly, every confident speaker started right where you are — even native speakers stumble! You don't have to speak perfectly here. Tell me one thing you enjoy doing in your free time, just like texting a friend.";
  } else if (
    /(movie|film|song|music|singer|cricket|football|sport|game|hobby|hobbies|draw|paint|book|read)/i.test(
      lower,
    )
  ) {
    reply = pickVariant(
      [
        "Oh nice, I love talking about things people enjoy! What makes that your favorite, and how often do you get time for it?",
        "That sounds fun! Tell me about the last time you watched, played, or enjoyed it — who were you with?",
      ],
      userTurnCount,
    );
  } else if (
    /(food|eat|ate|breakfast|lunch|dinner|tea|chai|coffee|cook|kitchen|dish|biryani|roti)/i.test(
      lower,
    )
  ) {
    reply = pickVariant(
      [
        "Now you're talking! Nothing beats good food. Do you enjoy cooking yourself, or is there someone in your family whose cooking is unbeatable?",
        "Mmm, that sounds delicious! What's your all-time comfort food when you've had a long day?",
      ],
      userTurnCount,
    );
  } else if (/(interview|job|resume|career|office|work|company|boss|internship)/i.test(lower)) {
    reply = pickVariant(
      [
        "Ooh, interview practice is one of the best ways to build confidence! Let's try a quick warmup: imagine I'm the interviewer — how would you introduce yourself in 2–3 sentences?",
        "That's a great goal! Tell me what kind of role or career interests you most, and we'll practice talking about your strengths naturally.",
      ],
      userTurnCount,
    );
  } else if (
    /(school|college|exam|test|study|homework|teacher|math|science|english|class)/i.test(lower)
  ) {
    reply = pickVariant(
      [
        "Got it! Classes and exams can keep you pretty busy. Which subject do you find easiest, and which one feels a bit tricky right now?",
        "That's cool! Tell me a little about what you're studying lately — is there something interesting you learned this week?",
      ],
      userTurnCount,
    );
  } else if (
    /(travel|trip|visit|city|derabassi|chandigarh|delhi|mountain|village|place|live)/i.test(lower)
  ) {
    reply = pickVariant(
      [
        "I love hearing about different places! What do you like most about living or visiting there?",
        "Sounds like a great place! If a friend visited there for one day, where would you take them first?",
      ],
      userTurnCount,
    );
  } else if (
    /(family|mother|mom|father|dad|sister|brother|friend|parents|weekend|today|yesterday|morning)/i.test(
      lower,
    )
  ) {
    reply = pickVariant(
      [
        "That's really sweet to hear! Sounds like you have good company around you. What did you all talk about or do together?",
        "Nice! Tell me a little more — what happened next, or what are your plans for the rest of today?",
      ],
      userTurnCount,
    );
  } else if (/(bye|goodbye|see you|talk later|gtg|good night)/i.test(lower)) {
    reply =
      "It was great chatting with you today! You did really well practicing out loud. Come back anytime you feel like talking!";
  } else {
    const words = trimmed
      .toLowerCase()
      .replace(/[^a-z\s']/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !GENERIC_TOPIC_STOPWORDS.has(w));
    const topicWord = words[0];
    if (topicWord) {
      reply = pickVariant(
        [
          `Oh, interesting! Tell me more about ${topicWord} — what got you thinking or talking about that today?`,
          `I like where this is going! How did your experience with ${topicWord} turn out, or what happened next?`,
        ],
        userTurnCount,
      );
    } else {
      reply = pickVariant(
        [
          "I'm listening! Go on — tell me a bit more detail in your own words, no rush at all.",
          "Interesting! Why do you feel that way about it, and what would you do next?",
        ],
        userTurnCount,
      );
    }
  }

  return correction ? { reply, correction } : { reply };
}
