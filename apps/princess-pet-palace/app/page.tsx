"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  countPetTap,
  createJourney,
  type CountChallenge,
  type JourneyRoom,
  type LetterChallenge,
  type MoveChallenge,
} from "./game-model";

type Screen = "home" | "journey" | "celebrate";
type FeedbackKind = "success" | "try" | null;

const cheers = ["Palace magic!", "You found it!", "Wonderful!", "Sparkle power!"];

function singularize(word: string): string {
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("s")) return word.slice(0, -1);
  return word;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [journey, setJourney] = useState<JourneyRoom[]>([]);
  const [roomIndex, setRoomIndex] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [feedbackKind, setFeedbackKind] = useState<FeedbackKind>(null);
  const [selectedPets, setSelectedPets] = useState<number[]>([]);
  const [lastChoice, setLastChoice] = useState<string | null>(null);
  const [moveSeconds, setMoveSeconds] = useState<number | null>(null);
  const [joinedPets, setJoinedPets] = useState<string[]>([]);
  const [sparkleStreak, setSparkleStreak] = useState(0);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const movementTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContext = useRef<AudioContext | null>(null);

  const room = journey[roomIndex];
  const completedRooms = roomIndex;
  const journeyProgress = journey.length ? Math.round((completedRooms / journey.length) * 100) : 0;

  const speak = useCallback(
    (message: string, force = false) => {
      if ((!soundOn && !force) || typeof window === "undefined" || !("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.86;
      utterance.pitch = 1.1;
      utterance.volume = 0.92;
      window.speechSynthesis.speak(utterance);
    },
    [soundOn],
  );

  const playTone = useCallback(
    (kind: "sparkle" | "tap" | "soft") => {
      if (!soundOn || typeof window === "undefined") return;
      const AudioContextClass =
        window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      const context = audioContext.current ?? new AudioContextClass();
      audioContext.current = context;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime;
      const frequencies = kind === "sparkle" ? [523, 659, 784] : kind === "tap" ? [330, 392] : [247, 220];

      oscillator.type = kind === "soft" ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(frequencies[0], start);
      frequencies.slice(1).forEach((frequency, index) => {
        oscillator.frequency.setValueAtTime(frequency, start + (index + 1) * 0.09);
      });
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(kind === "tap" ? 0.09 : 0.14, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.36);
    },
    [soundOn],
  );

  const clearTimers = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    if (movementTimer.current) clearInterval(movementTimer.current);
    advanceTimer.current = null;
    movementTimer.current = null;
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, [clearTimers]);

  const resetRoomState = () => {
    setSelectedPets([]);
    setLastChoice(null);
    setMoveSeconds(null);
    setFeedback("");
    setFeedbackKind(null);
  };

  const startGame = () => {
    clearTimers();
    const nextJourney = createJourney();
    setJourney(nextJourney);
    setRoomIndex(0);
    setJoinedPets([]);
    setSparkleStreak(0);
    resetRoomState();
    setScreen("journey");
    window.setTimeout(() => speak(`The palace doors are open! ${nextJourney[0].spokenPrompt}`), 240);
  };

  const goHome = () => {
    clearTimers();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setScreen("home");
    setJourney([]);
    setRoomIndex(0);
    resetRoomState();
  };

  const finishRoom = useCallback(
    (pet?: string) => {
      clearTimers();
      const cheer = cheers[(roomIndex + sparkleStreak) % cheers.length];
      setFeedback(cheer);
      setFeedbackKind("success");
      setSparkleStreak((value) => value + 1);
      if (pet) setJoinedPets((current) => [...current, pet]);
      playTone("sparkle");
      speak(cheer);

      advanceTimer.current = setTimeout(() => {
        const nextIndex = roomIndex + 1;
        if (nextIndex >= journey.length) {
          setScreen("celebrate");
          setFeedback("");
          setFeedbackKind(null);
          speak("The grand ballroom is open! You finished the whole palace adventure!");
          return;
        }

        setRoomIndex(nextIndex);
        resetRoomState();
        window.setTimeout(() => speak(journey[nextIndex].spokenPrompt), 220);
      }, 1150);
    },
    [clearTimers, journey, playTone, roomIndex, speak, sparkleStreak],
  );

  const tryAnother = (choiceId: string) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setLastChoice(choiceId);
    setFeedback("Try another pet!");
    setFeedbackKind("try");
    playTone("soft");
    speak("Try another pet!");
    advanceTimer.current = setTimeout(() => {
      setLastChoice(null);
      setFeedback("");
      setFeedbackKind(null);
    }, 850);
  };

  const handleLetterChoice = (challenge: LetterChallenge, choiceIndex: number) => {
    if (feedbackKind === "success") return;
    const choice = challenge.choices[choiceIndex];
    if (choice.letter === challenge.answer) finishRoom(choice.emoji);
    else tryAnother(`${challenge.id}-${choiceIndex}`);
  };

  const handlePetTap = (challenge: CountChallenge, petIndex: number) => {
    if (feedbackKind === "success") return;
    const result = countPetTap(selectedPets, petIndex, challenge.total);
    if (result.selected === selectedPets) return;
    setSelectedPets(result.selected);
    playTone("tap");
    speak(String(result.spokenNumber));
    if (result.complete) {
      advanceTimer.current = setTimeout(() => finishRoom(challenge.animal), 420);
    }
  };

  const startMovement = (challenge: MoveChallenge) => {
    if (moveSeconds !== null) return;
    setMoveSeconds(challenge.seconds);
    playTone("tap");
    speak(`${challenge.action} Ready, go!`);

    let remaining = challenge.seconds;
    movementTimer.current = setInterval(() => {
      remaining -= 1;
      setMoveSeconds(remaining);
      if (remaining > 0 && remaining <= 3) speak(String(remaining));
      if (remaining <= 0) {
        clearTimers();
        advanceTimer.current = setTimeout(() => finishRoom(challenge.emoji), 320);
      }
    }, 1000);
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    if (!next && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (next) window.setTimeout(() => speak("Sound on!", true), 100);
  };

  const uniquePartyPets = useMemo(() => [...new Set(joinedPets)], [joinedPets]);

  return (
    <main className={`game-shell screen-${screen}`}>
      <div className="ambient-world" aria-hidden="true">
        <span className="ambient-sparkle sparkle-one">✦</span>
        <span className="ambient-sparkle sparkle-two">✧</span>
        <span className="ambient-sparkle sparkle-three">✦</span>
        <span className="ambient-cloud cloud-a">☁</span>
        <span className="ambient-cloud cloud-b">☁</span>
      </div>

      <header className="topbar">
        <button className="brand" type="button" onClick={goHome} aria-label="Go to Princess Pet Palace home">
          <span className="brand-mark" aria-hidden="true">♛</span>
          <span className="brand-name">Princess Pet Palace</span>
        </button>

        <div className="topbar-actions">
          {screen === "journey" && (
            <div className="magic-counter" aria-label={`${completedRooms} stars collected`}>
              <span aria-hidden="true">★</span>
              <strong>{completedRooms}</strong>
            </div>
          )}
          <button className="icon-button" type="button" onClick={toggleSound} aria-label={soundOn ? "Turn sound off" : "Turn sound on"}>
            <span aria-hidden="true">{soundOn ? "🔊" : "🔇"}</span>
          </button>
        </div>
      </header>

      {screen === "home" && (
        <section className="home-stage" aria-labelledby="game-title">
          <div className="hero-card">
            <div className="hero-copy">
              <p className="eyebrow"><span aria-hidden="true">✨</span> A new adventure every time</p>
              <h1 id="game-title">Open the palace doors</h1>
              <p className="hero-lede">Help the royal pets through six magical rooms filled with letters, counting, and movement.</p>
              <button className="primary-button" type="button" onClick={startGame} data-testid="start-game">
                <span className="button-sparkle" aria-hidden="true">✦</span>
                <span>Start adventure</span>
                <span className="button-arrow" aria-hidden="true">→</span>
              </button>
              <div className="quest-preview" aria-label="Adventure activities">
                <span><b aria-hidden="true">🌸</b> Letter Garden</span>
                <span><b aria-hidden="true">🐾</b> Pet Parade</span>
                <span><b aria-hidden="true">🎀</b> Royal Gym</span>
              </div>
            </div>

            <div className="hero-world" aria-hidden="true">
              <div className="moon-glow" />
              <div className="palace">
                <span className="palace-flag">♥</span>
                <span className="palace-wing wing-left" />
                <span className="palace-main"><i /><i /><i /></span>
                <span className="palace-wing wing-right" />
              </div>
              <div className="hero-path" />
              <span className="hero-character princess">👸</span>
              <span className="hero-character bunny">🐰</span>
              <span className="hero-character kitten">🐱</span>
              <span className="hero-character unicorn">🦄</span>
              <span className="floating-star star-a">★</span>
              <span className="floating-star star-b">★</span>
              <span className="floating-star star-c">★</span>
            </div>
          </div>
          <p className="grownup-note"><span aria-hidden="true">🔊</span> Spoken instructions begin after the first tap. No ads, accounts, or tracking.</p>
        </section>
      )}

      {screen === "journey" && room && (
        <section className="journey-stage" aria-labelledby="game-title">
          <nav className="journey-map" aria-label={`Palace journey, room ${roomIndex + 1} of ${journey.length}`}>
            <div className="journey-track" aria-hidden="true"><span style={{ width: `${journeyProgress}%` }} /></div>
            {journey.map((journeyRoom, index) => (
              <div className={`map-stop ${index < roomIndex ? "complete" : index === roomIndex ? "current" : "upcoming"}`} key={journeyRoom.id}>
                <span className="map-icon" aria-hidden="true">{index < roomIndex ? "★" : journeyRoom.icon}</span>
                <span className="map-label">{index === roomIndex ? journeyRoom.label : index + 1}</span>
              </div>
            ))}
          </nav>

          <div className={`activity-card activity-${room.kind}`}>
            <div className="room-heading">
              <div>
                <p className="room-number">Room {roomIndex + 1} of {journey.length}</p>
                <p className="activity-kicker">{room.label}</p>
              </div>
              <button className="hear-button" type="button" onClick={() => speak(room.spokenPrompt)} aria-label="Hear the instruction again">
                <span aria-hidden="true">🔊</span><span>Hear it</span>
              </button>
            </div>

            {room.kind === "letter" && <LetterRoom room={room} lastChoice={lastChoice} disabled={feedbackKind === "success"} onChoose={handleLetterChoice} />}
            {room.kind === "count" && <CountRoom room={room} selectedPets={selectedPets} disabled={feedbackKind === "success"} onTap={handlePetTap} />}
            {room.kind === "move" && <MoveRoom room={room} seconds={moveSeconds} disabled={feedbackKind === "success"} onStart={startMovement} />}

            <div className="party-rail" aria-label={`${uniquePartyPets.length} royal pets have joined your party`}>
              <span className="party-princess" aria-hidden="true">👸</span>
              <div className="party-pets" aria-hidden="true">
                {uniquePartyPets.length === 0 ? <span className="empty-party">Who will join?</span> : uniquePartyPets.map((pet, index) => <span key={`${pet}-${index}`}>{pet}</span>)}
              </div>
              <span className="party-label">Your royal party</span>
            </div>
          </div>

          <div className={`feedback-toast ${feedbackKind ?? ""}`} role="status" aria-live="polite" aria-atomic="true">
            {feedback && <><span className="feedback-icon" aria-hidden="true">{feedbackKind === "success" ? "✨" : "💜"}</span><strong>{feedback}</strong></>}
          </div>
        </section>
      )}

      {screen === "celebrate" && (
        <section className="celebration-stage" aria-labelledby="game-title">
          <div className="celebration-card">
            <div className="confetti" aria-hidden="true"><span>★</span><span>✦</span><span>●</span><span>★</span><span>✦</span><span>●</span></div>
            <p className="eyebrow"><span aria-hidden="true">👑</span> Grand ballroom unlocked</p>
            <div className="finale-party" aria-hidden="true">
              <span>👸</span>
              {(uniquePartyPets.length ? uniquePartyPets : ["🐰", "🐱", "🦄"]).map((pet, index) => <span key={`${pet}-${index}`}>{pet}</span>)}
            </div>
            <div className="finale-stars" aria-label={`${journey.length} stars collected`}>{journey.map((_, index) => <span key={index} aria-hidden="true">★</span>)}</div>
            <h1 id="game-title">The palace is sparkling!</h1>
            <p className="celebration-copy">You found letters, counted every pet, and completed the royal moves.</p>
            <div className="finale-actions">
              <button className="primary-button" type="button" onClick={startGame} data-testid="play-again"><span aria-hidden="true">↻</span><span>New adventure</span></button>
              <button className="secondary-button" type="button" onClick={goHome}>Palace home</button>
            </div>
          </div>
        </section>
      )}

      <footer><span aria-hidden="true">♡</span> Made for little learners and big imaginations <span aria-hidden="true">♡</span></footer>
    </main>
  );
}

function LetterRoom({ room, lastChoice, disabled, onChoose }: { room: JourneyRoom; lastChoice: string | null; disabled: boolean; onChoose: (challenge: LetterChallenge, index: number) => void }) {
  const challenge = room.challenge as LetterChallenge;
  return (
    <div className="activity-body letter-room">
      <div className="prompt-lockup">
        <span className="letter-orb" aria-hidden="true">{challenge.answer}</span>
        <div><h1 id="game-title">{room.prompt}</h1><p>Tap the animal whose name begins with <strong>{challenge.answer}</strong>.</p></div>
      </div>
      <div className="animal-choices">
        {challenge.choices.map((choice, index) => {
          const choiceId = `${challenge.id}-${index}`;
          return (
            <button className={`animal-choice ${lastChoice === choiceId ? "not-this-one" : ""}`} type="button" key={choiceId} onClick={() => onChoose(challenge, index)} disabled={disabled} aria-label={`${choice.name}, starts with ${choice.letter}`}>
              <span className="choice-emoji" aria-hidden="true">{choice.emoji}</span>
              <span className="choice-name">{choice.name}</span>
              <span className="choice-letter" aria-hidden="true">{choice.letter}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CountRoom({ room, selectedPets, disabled, onTap }: { room: JourneyRoom; selectedPets: number[]; disabled: boolean; onTap: (challenge: CountChallenge, index: number) => void }) {
  const challenge = room.challenge as CountChallenge;
  return (
    <div className="activity-body count-room">
      <div className="count-heading"><div><h1 id="game-title">{room.prompt}</h1><p>They&apos;ll wear a tiny crown when counted.</p></div><div className="count-badge" aria-live="polite"><strong>{selectedPets.length}</strong><span>of {challenge.total}</span></div></div>
      <div className={`pet-meadow pets-${challenge.total}`} aria-label={`${challenge.total} ${challenge.animalName} to count`}>
        {Array.from({ length: challenge.total }, (_, index) => {
          const selectedPosition = selectedPets.indexOf(index);
          const counted = selectedPosition >= 0;
          return (
            <button className={`count-pet pet-position-${index + 1} ${counted ? "counted" : ""}`} type="button" key={index} onClick={() => onTap(challenge, index)} disabled={disabled} aria-label={`${singularize(challenge.animalName)} ${index + 1}${counted ? `, counted as ${selectedPosition + 1}` : ", not counted yet"}`}>
              <span className="pet-emoji" aria-hidden="true">{challenge.animal}</span>
              {counted && <span className="count-crown" aria-hidden="true">♛</span>}
              {counted && <span className="count-number" aria-hidden="true">{selectedPosition + 1}</span>}
            </button>
          );
        })}
      </div>
      <div className="count-dots" aria-hidden="true">{Array.from({ length: challenge.total }, (_, index) => <span className={index < selectedPets.length ? "filled" : ""} key={index} />)}</div>
    </div>
  );
}

function MoveRoom({ room, seconds, disabled, onStart }: { room: JourneyRoom; seconds: number | null; disabled: boolean; onStart: (challenge: MoveChallenge) => void }) {
  const challenge = room.challenge as MoveChallenge;
  const progress = seconds === null ? 0 : ((challenge.seconds - seconds) / challenge.seconds) * 100;
  return (
    <div className="activity-body move-room">
      <div className={`move-visual ${seconds !== null && seconds > 0 ? "moving" : ""}`} style={{ "--move-progress": `${progress}%` } as React.CSSProperties}>
        <span className="move-ring" aria-hidden="true" />
        <span className="move-emoji" aria-hidden="true">{challenge.emoji}</span>
        {seconds !== null && <span className="move-count" aria-live="polite">{seconds > 0 ? seconds : "★"}</span>}
      </div>
      <h1 id="game-title">{challenge.title}</h1>
      <p className="move-action">{challenge.action}</p>
      {seconds === null ? (
        <button className="move-button" type="button" onClick={() => onStart(challenge)} disabled={disabled}><span aria-hidden="true">✨</span><span>Let&apos;s move!</span></button>
      ) : (
        <div className="movement-message" aria-live="polite">{seconds > 0 ? "Keep going!" : "Beautiful!"}</div>
      )}
    </div>
  );
}
