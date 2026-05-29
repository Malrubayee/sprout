"use client";

import RoomTile from "./RoomTile";

const rooms = [
  "JP-NZ-01",
  "JP-NZ-02",
  "JP-NZ-03",
  "JP-NZ-04",
  "JP-NZ-05",
  "JP-NZ-06",
];

export default function TeacherDashboard({
  onSelectRoom,
}) {

  return (

    <div className="p-6">

      <div className="bg-white rounded-3xl border p-6 mb-6">

        <h1 className="text-4xl font-semibold mb-3">
          🌱 Teacher Dashboard
        </h1>

        <div className="space-y-2 text-gray-700">

          <div>
            🇯🇵 Japan ↔ 🇳🇿 New Zealand
          </div>

          <div>
            Languages: Japanese / English
          </div>

          <div>
            Sister School Program
          </div>

        </div>

      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">

        {rooms.map((room) => (

          <RoomTile
            key={room}
            room={room}
            onClick={() => onSelectRoom(room)}
          />

        ))}

      </div>

    </div>
  );
}