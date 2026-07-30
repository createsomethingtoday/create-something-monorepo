"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type GameStep = "home" | "letter" | "count" | "move" | "celebrate";

type LetterChallenge = {
  answer: string;
  animal: string;
  animalName: string;
  choices: string[];
};

type CountChallenge = {
  animal: string;
  animalName: string;
  answer: number;
  choices: number[];
};

const letterChallenges: LetterChallenge[] = [
  { answer: "P", animal: "🐶", animalName: "puppy", choices: ["P", "B", "T"] },
  { answer: "C", animal: "🐱", animalName: "cat", choices: ["O", "C", "G"] },
  { answer: "B", animal: "🐰", animalName: "bunny", choices: ["D", "R", "B"] },
  { answer: "F", animal: "🦊", animalName: "fox", choices: ["F", "E", "L"] },
];

const countChallenges: CountChallenge[] = [
  { animal: "🐰", animalName: "bunnies", answer: 2, choices: [1, 2, 3] },
  { animal: "🐱", animalName: "kittens", answer: 3, choices: [2, 3, 4] },
  { animal: "🦄", animalName: "unicorns", answer: 4, choices: [3, 4, 5] },
  { animal: "🐶", animalName: "puppies", answer: 5, choices: [4, 5, 6] },
];

const movementChallenges = [
  { emoji: "⭐", title: "Star stretch", prompt: "Reach your arms up and out like a big sparkly star!" },
  { emoji: "🦩", title: "Flamingo balance", prompt: "Stand tall and lift one foot like a graceful flamingo!" },
  { emoji: "🦋", title: "Butterfly arms", prompt: "Flap your arms slowly like a beautiful butterfly!" },
];

const roundOrder: GameStep[] = ["letter", "count", "move", "letter", "count"];
const cheers = ["You did it!", "Wonderful!", "Hooray!", "Brilliant!"];

function getRandomItem<T>(items: T[], index: number): T {
  return items[index % items.length];
}

export default function Home() {
  const [step, setStep] = useState<GameStep>("home");
  const [round, setRound] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContext = useRef<AudioContext | null>(null);

  const letter = getRandomItem(letterChallenges, round);
  const count = getRandomItem(countChallenges, round);
  const movement = getRandomItem(movementChallenges, round);

  const speak = useCallback(
    (message: string) => {
      if (!soundOn || typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const voice = new SpeechSynthesisUtterance(message);
      voice.rate = 0.88;
      voice.pitch = 1.12;
      window.speechSynthesis.speak(voice);
    },
    [soundOn],
  );

  const chime = useCallback(
    (happy: boolean) => {
      if (!soundOn || typeof window === "undefined") return;
      const AudioContextClass = window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = audioContext.current ?? new AudioContextClass();
      audioContext.current = context;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(happy ? 523 : 220, context.currentTime);
      if (happy) oscillator.frequency.exponentialRampToValueAtTime(784, context.currentTime + 0.18);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.3);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.32);
    },
    [soundOn],
  );

  const promptForStep = useCallback(
    (nextStep: GameStep) => {
      if (nextStep === "letter") speak(`Can you find the letter ${letter.answer}? ${letter.answer} is for ${letter.animalName}.`);
      if (nextStep === "count") speak(`Count the ${count.animalName}. How many do you see?`);
      if (nextStep === "move") speak(movement.prompt);
      if (nextStep === "celebrate") speak("You filled the whole star path! You are a learning princess!");
    },
    [count.animalName, letter.animalName, letter.answer, movement.prompt, speak],
  );

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const startGame = () => {
    setRound(0);
    setFeedback("");
    setIsCorrect(null);
    setStep("letter");
    window.setTimeout(() => speak("Welcome to the Princess Pet Palace! Can you find the letter P? P is for puppy."), 200);
  };

  const moveToNextRound = () => {
    const nextRound = round + 1;
    if (nextRound >= roundOrder.length) {
      setRound(roundOrder.length);
      setStep("celebrate");
      setFeedback("");
      setIsCorrect(null);
      window.setTimeout(() => promptForStep("celebrate"), 200);
      return;
    }

    const nextStep = roundOrder[nextRound];
    setRound(nextRound);
    setFeedback("");
    setIsCorrect(null);
    setStep(nextStep);
    window.setTimeout(() => {
      const nextLetter = getRandomItem(letterChallenges, nextRound);
      const nextCount = getRandomItem(countChallenges, nextRound);
      const nextMovement = getRandomItem(movementChallenges, nextRound);
      if (nextStep === "letter") speak(`Can you find the letter ${nextLetter.answer}? ${nextLetter.answer} is for ${nextLetter.animalName}.`);
      if (nextStep === "count") speak(`Count the ${nextCount.animalName}. How many do you see?`);
      if (nextStep === "move") speak(nextMovement.prompt);
    }, 250);
  };

  const celebrateAnswer = () => {
    const cheer = getRandomItem(cheers, round);
    setIsCorrect(true);
    setFeedback(cheer);
    chime(true);
    speak(cheer);
    advanceTimer.current = setTimeout(moveToNextRound, 1350);
  };

  const tryAgain = () => {
    setIsCorrect(false);
    setFeedback("Almost! Try again!");
    chime(false);
    speak("Almost! Try again!");
    advanceTimer.current = setTimeout(() => {
      setIsCorrect(null);
      setFeedback("");
      promptForStep(step);
    }, 1100);
  };

  const handleLetter = (choice: string) => {
    if (isCorrect !== null) return;
    if (choice === letter.answer) celebrateAnswer();
    else tryAgain();
  };

  const handleCount = (choice: number) => {
    if (isCorrect !== null) return;
    if (choice === count.answer) celebrateAnswer();
    else tryAgain();
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    if (!next && typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    if (next) window.setTimeout(() => speak("Sound on!"), 100);
  };

  return (
    <main className="game-shell">
      <div className="sky-sparkles" aria-hidden="true">
        <span>✦</span><span>✧</span><span>✦</span><span>✧</span><span>✦</span>
      </div>

      <header className="topbar">
        <a className="brand" href="#game" aria-label="Princess Pet Palace home" onClick={(event) => { event.preventDefault(); setStep("home"); setRound(0); }}>
          <span className="brand-crown" aria-hidden="true">♛</span>
          <span>Princess Pet Palace</span>
        </a>
        <button className="sound-button" type="button" onClick={toggleSound} aria-label={soundOn ? "Turn sound off" : "Turn sound on"}>
          <span aria-hidden="true">{soundOn ? "🔊" : "🔇"}</span>
        </button>
      </header>

      <section className="game-stage" id="game" aria-labelledby="game-title">
        {step !== "home" && step !== "celebrate" && (
          <div className="star-path" aria-label={`${round} of ${roundOrder.length} stars earned`}>
            {roundOrder.map((_, index) => (
              <span className={index < round ? "star earned" : index === round ? "star current" : "star"} key={index} aria-hidden="true">★</span>
            ))}
          </div>
        )}

        {step === "home" && (
          <div className="welcome-card">
            <div className="palace-scene" aria-hidden="true">
              <span className="cloud cloud-one">☁</span>
              <span className="cloud cloud-two">☁</span>
              <div className="castle">
                <span className="castle-crown">♛</span>
                <span className="castle-tower left">▥</span>
                <span className="castle-center">▥</span>
                <span className="castle-tower right">▥</span>
              </div>
              <span className="welcome-princess">👸</span>
              <span className="welcome-pet pet-one">🐰</span>
              <span className="welcome-pet pet-two">🐱</span>
            </div>
            <p className="eyebrow">A magical learning adventure</p>
            <h1 id="game-title">Princess Pet Palace</h1>
            <p className="welcome-copy">Letters, counting, animals, and wiggles!</p>
            <button className="start-button" type="button" onClick={startGame} data-testid="start-game">
              <span aria-hidden="true">✨</span>
              <span>Let&apos;s play!</span>
              <span aria-hidden="true">→</span>
            </button>
            <p className="grownup-note"><span aria-hidden="true">🔊</span> Turn sound on so the palace can read each activity aloud.</p>
          </div>
        )}

        {step === "letter" && (
          <div className="activity-card letter-card">
            <button className="repeat-button" type="button" onClick={() => promptForStep("letter")} aria-label="Hear the letter question again"><span aria-hidden="true">🔊</span> Hear it</button>
            <p className="activity-kicker">Letter garden</p>
            <div className="animal-hero" aria-hidden="true">{letter.animal}</div>
            <h1 id="game-title">Find the letter <span className="target-letter">{letter.answer}</span></h1>
            <p className="activity-prompt"><strong>{letter.answer}</strong> is for {letter.animalName}</p>
            <div className="choice-grid letter-choices">
              {letter.choices.map((choice) => (
                <button className="choice-button letter-choice" type="button" key={choice} onClick={() => handleLetter(choice)} disabled={isCorrect !== null} aria-label={`Letter ${choice}`}>
                  {choice}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "count" && (
          <div className="activity-card count-card">
            <button className="repeat-button" type="button" onClick={() => promptForStep("count")} aria-label="Hear the counting question again"><span aria-hidden="true">🔊</span> Hear it</button>
            <p className="activity-kicker">Royal pet parade</p>
            <h1 id="game-title">How many?</h1>
            <div className="animal-group" aria-label={`${count.answer} ${count.animalName}`}>
              {Array.from({ length: count.answer }, (_, index) => <span key={index} aria-hidden="true">{count.animal}</span>)}
            </div>
            <div className="choice-grid number-choices">
              {count.choices.map((choice) => (
                <button className="choice-button number-choice" type="button" key={choice} onClick={() => handleCount(choice)} disabled={isCorrect !== null} aria-label={`${choice}`}>
                  {choice}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "move" && (
          <div className="activity-card movement-card">
            <button className="repeat-button" type="button" onClick={() => promptForStep("move")} aria-label="Hear the movement again"><span aria-hidden="true">🔊</span> Hear it</button>
            <p className="activity-kicker">Princess gymnastics</p>
            <div className="movement-emoji" aria-hidden="true">{movement.emoji}</div>
            <h1 id="game-title">{movement.title}</h1>
            <p className="movement-prompt">{movement.prompt}</p>
            <button className="done-button" type="button" onClick={celebrateAnswer} disabled={isCorrect !== null} aria-label="I did the movement">
              <span className="done-check" aria-hidden="true">✓</span>
              <span>I did it!</span>
            </button>
          </div>
        )}

        {step === "celebrate" && (
          <div className="celebration-card">
            <div className="celebration-stars" aria-hidden="true">★ ★ ★ ★ ★</div>
            <div className="celebration-cast" aria-hidden="true"><span>🐰</span><span>👸</span><span>🦄</span></div>
            <p className="eyebrow">The palace is sparkling!</p>
            <h1 id="game-title">You&apos;re a star!</h1>
            <p className="celebration-copy">Letters found. Pets counted. Gymnastics complete!</p>
            <button className="start-button" type="button" onClick={startGame} data-testid="play-again"><span aria-hidden="true">↻</span><span>Play again</span></button>
          </div>
        )}

        <div className={`feedback ${isCorrect === true ? "success" : isCorrect === false ? "try-again" : ""}`} role="status" aria-live="polite" aria-atomic="true">
          {feedback && <><span aria-hidden="true">{isCorrect ? "✨" : "💜"}</span> {feedback}</>}
        </div>
      </section>

      <footer><span aria-hidden="true">♡</span> Made for little learners and big imaginations <span aria-hidden="true">♡</span></footer>
    </main>
  );
}
