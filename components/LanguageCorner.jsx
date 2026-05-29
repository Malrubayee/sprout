// components/LanguageCorner.jsx

"use client";

import { useState } from "react";

const Button = ({ children, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-xl text-sm transition-all
      ${
        active
          ? "bg-sky-300 text-sky-900"
          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
      }`}
  >
    {children}
  </button>
);

const roomLanguageData = {
  "JP-NZ-01": {
    roomName: "Japan ↔ New Zealand",
    languages: ["Japanese", "English"],
    ageGroup: "8-10",

    vocab: [
      {
        japanese: "こんにちは",
        english: "Hello",
        pronunciation: "Konnichiwa",
        audioText: "こんにちは",
        language: "ja-JP",
      },
      {
        japanese: "ありがとう",
        english: "Thank you",
        pronunciation: "Arigatou",
        audioText: "ありがとう",
        language: "ja-JP",
      },
      {
        japanese: "学校",
        english: "School",
        pronunciation: "Gakkou",
        audioText: "学校",
        language: "ja-JP",
      },
      {
        japanese: "友だち",
        english: "Friend",
        pronunciation: "Tomodachi",
        audioText: "友だち",
        language: "ja-JP",
      },
    ],

    phrases: [
      {
        english: "My name is ___",
        japanese: "わたしの名前は___です",
        audioText: "わたしの名前は___です",
        language: "ja-JP",
      },
      {
        english: "What games do you like?",
        japanese: "どんなゲームが好きですか？",
        audioText: "どんなゲームが好きですか？",
        language: "ja-JP",
      },
      {
        english: "Nice to meet you!",
        japanese: "よろしくお願いします！",
        audioText: "よろしくお願いします",
        language: "ja-JP",
      },
    ],

    grammar: [
      {
        title: "Japanese Sentence Order",
        explanation:
          "Japanese usually follows Subject → Object → Verb order.",
        example: "わたし は パン を たべます。",
      },
      {
        title: "Japanese Particle は",
        explanation: "は shows the topic of the sentence.",
        example: "わたし は がくせいです。",
      },
      {
        title: "English Plurals",
        explanation: "Add -s for more than one object.",
        example: "cat → cats",
      },
    ],

    missions: [
      "Teach your partner 3 food words 🍙",
      "Ask someone what sport they like ⚽",
      "Draw your school lunch 🍱",
      "Teach your partner your favorite animal 🐼",
    ],

    gameQuestions: [
      {
        question: "What is 'Hello' in Japanese?",
        options: ["ありがとう", "こんにちは", "さようなら"],
        answer: "こんにちは",
      },
      {
        question: "What does '学校' mean?",
        options: ["School", "Friend", "Teacher"],
        answer: "School",
      },
      {
        question: "What does 'ありがとう' mean?",
        options: ["Goodbye", "Please", "Thank you"],
        answer: "Thank you",
      },
    ],
  },
};

export default function LanguageCorner({ roomCode = "JP-NZ-01" }) {
  const [tab, setTab] = useState("vocab");

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);

  const room =
    roomLanguageData[roomCode] || roomLanguageData["JP-NZ-01"];

  const question = room.gameQuestions[currentQuestion];

  const speak = (text, language) => {
    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = language;
    utterance.rate = 0.9;

    speechSynthesis.speak(utterance);
  };

  const handleAnswer = (option) => {
    if (selected) return;

    setSelected(option);

    if (option === question.answer) {
      setScore((prev) => prev + 1);
    }
  };

  const nextQuestion = () => {
    setSelected(null);

    if (currentQuestion < room.gameQuestions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      setCurrentQuestion(0);
      setScore(0);
    }
  };

  const todayMission =
    room.missions[
      new Date().getDate() % room.missions.length
    ];

  return (
    <div className="space-y-6">
      {/* Room Info */}
      <div className="bg-gradient-to-r from-sky-100 to-emerald-100 rounded-2xl p-5 border">
        <h2 className="text-2xl font-semibold mb-2">
          🌏 {room.roomName}
        </h2>

        <div className="flex gap-2 flex-wrap mb-3">
          {room.languages.map((lang, i) => (
            <span
              key={i}
              className="bg-white px-3 py-1 rounded-full text-sm border"
            >
              {lang}
            </span>
          ))}
        </div>

        <div className="text-gray-700">
          Age Group: {room.ageGroup}
        </div>
      </div>

      {/* Today's Mission */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
        <h3 className="text-xl font-semibold mb-2">
          ⭐ Today’s Mission
        </h3>

        <p className="text-lg">
          {todayMission}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          active={tab === "vocab"}
          onClick={() => setTab("vocab")}
        >
          📚 Vocabulary
        </Button>

        <Button
          active={tab === "phrases"}
          onClick={() => setTab("phrases")}
        >
          💬 Phrases
        </Button>

        <Button
          active={tab === "grammar"}
          onClick={() => setTab("grammar")}
        >
          ✏️ Grammar
        </Button>

        <Button
          active={tab === "games"}
          onClick={() => setTab("games")}
        >
          🎮 Games
        </Button>
      </div>

      {/* Vocabulary */}
      {tab === "vocab" && (
        <div className="grid md:grid-cols-2 gap-3">
          {room.vocab.map((word, i) => (
            <div
              key={i}
              className="bg-gray-50 border rounded-2xl p-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-2xl mb-1">
                    {word.japanese}
                  </div>

                  <div className="text-gray-700 font-medium">
                    {word.english}
                  </div>

                  <div className="text-sm text-gray-500 mt-1">
                    {word.pronunciation}
                  </div>
                </div>

                <button
                  onClick={() =>
                    speak(word.audioText, word.language)
                  }
                  className="bg-sky-100 hover:bg-sky-200 px-3 py-2 rounded-xl"
                >
                  🔊
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Phrases */}
      {tab === "phrases" && (
        <div className="space-y-3">
          {room.phrases.map((phrase, i) => (
            <div
              key={i}
              className="bg-gray-50 border rounded-2xl p-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-lg">
                    {phrase.english}
                  </div>

                  <div className="text-gray-700 mt-2 text-xl">
                    {phrase.japanese}
                  </div>
                </div>

                <button
                  onClick={() =>
                    speak(phrase.audioText, phrase.language)
                  }
                  className="bg-sky-100 hover:bg-sky-200 px-3 py-2 rounded-xl"
                >
                  🔊
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grammar */}
      {tab === "grammar" && (
        <div className="space-y-3">
          {room.grammar.map((item, i) => (
            <div
              key={i}
              className="bg-gray-50 border rounded-2xl p-4"
            >
              <h3 className="font-semibold text-lg mb-2">
                {item.title}
              </h3>

              <p className="text-gray-700 mb-3">
                {item.explanation}
              </p>

              <div className="bg-white border rounded-xl p-3">
                {item.example}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Games */}
      {tab === "games" && (
        <div className="bg-gray-50 border rounded-2xl p-6">
          <div className="mb-4">
            <div className="text-sm text-gray-500">
              Score: {score}
            </div>

            <h3 className="text-2xl font-semibold mt-2">
              {question.question}
            </h3>
          </div>

          <div className="space-y-3">
            {question.options.map((option, i) => {
              let style =
                "bg-white hover:bg-gray-100 border";

              if (selected) {
                if (option === question.answer) {
                  style = "bg-green-200 border-green-400";
                } else if (option === selected) {
                  style = "bg-red-200 border-red-400";
                }
              }

              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(option)}
                  className={`w-full text-left p-4 rounded-xl transition-all ${style}`}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {selected && (
            <button
              onClick={nextQuestion}
              className="mt-5 px-5 py-3 rounded-xl bg-sky-200 hover:bg-sky-300"
            >
              Next Question →
            </button>
          )}
        </div>
      )}
    </div>
  );
}