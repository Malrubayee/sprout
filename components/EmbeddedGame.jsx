"use client";

import { useState, useEffect } from "react";

const sentences = [
  { words: ["The", "cat", "chased", "the", "mouse"] },
  { words: ["My", "brother", "kicked", "the", "football"] },
  { words: ["The", "teacher", "explained", "the", "lesson"] },
  { words: ["Our", "dog", "buried", "a", "bone"] },
  { words: ["She", "finished", "her", "homework", "quickly"] },

  // extra ones
  { words: ["The", "sun", "warms", "the", "earth"] },
  { words: ["A", "boy", "opened", "the", "door"] },
  { words: ["The", "chef", "cooked", "a", "meal"] },
  { words: ["My", "friend", "sent", "a", "message"] },
  { words: ["The", "baby", "dropped", "the", "toy"] },
  { words: ["We", "watched", "a", "movie"] },
  { words: ["The", "student", "answered", "the", "question"] },
  { words: ["The", "wind", "moved", "the", "leaves"] },
  { words: ["Her", "dad", "fixed", "the", "car"] },
  { words: ["They", "built", "a", "house"] }
];

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function EmbeddedGame({ school }) {
  const [current, setCurrent] = useState(0);
  const [order, setOrder] = useState([]);
  const [dragIndex, setDragIndex] = useState(null);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setOrder(shuffle(sentences[current].words));
    setFeedback("");
  }, [current]);

  const handleDragStart = (index) => {
    setDragIndex(index);
  };

  const handleDrop = (index) => {
    if (dragIndex === null || dragIndex === index) return;

    const newOrder = [...order];
    const item = newOrder.splice(dragIndex, 1)[0];
    newOrder.splice(index, 0, item);

    setOrder(newOrder);
    setDragIndex(null);
  };

  const checkAnswer = () => {
    const correct = sentences[current].words.join(" ");
    const attempt = order.join(" ");

    if (correct === attempt) {
      setScore(score + 1);
      setFeedback("🎉 Correct!");
    } else {
      setFeedback("❌ Try again");
    }
  };

  const nextSentence = () => {
    if (current < sentences.length - 1) {
      setCurrent(current + 1);
    } else {
      setFeedback(`🏆 Finished! Score: ${score}/${sentences.length}`);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-start text-center p-4 bg-gray-50 rounded-xl">
      
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold">SVO Builder</h2>
        <p className="text-xs text-gray-500">{school}</p>
        <p className="text-xs text-gray-400">
          Arrange the sentence correctly
        </p>
      </div>

      {/* Words */}
      <div className="flex flex-wrap justify-center gap-2 mb-4 min-h-[80px]">
        {order.map((word, i) => (
          <div
            key={i}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(i)}
            className="px-4 py-2 bg-white border rounded-xl shadow-sm cursor-move hover:scale-105 transition"
          >
            {word}
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={checkAnswer}
          className="px-4 py-2 rounded-xl bg-emerald-200 text-emerald-900 hover:bg-emerald-300 text-sm"
        >
          Check
        </button>

        <button
          onClick={() => setOrder(shuffle(sentences[current].words))}
          className="px-4 py-2 rounded-xl bg-sky-200 text-sky-900 hover:bg-sky-300 text-sm"
        >
          Shuffle
        </button>

        <button
          onClick={nextSentence}
          className="px-4 py-2 rounded-xl bg-indigo-200 text-indigo-900 hover:bg-indigo-300 text-sm"
        >
          Next
        </button>
      </div>

      {/* Feedback */}
      <div className="text-sm font-medium text-gray-700">
        {feedback}
      </div>

      {/* Score */}
      <div className="text-xs text-gray-500 mt-2">
        Score: {score}
      </div>
    </div>
  );
}