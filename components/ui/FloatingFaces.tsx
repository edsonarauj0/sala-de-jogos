"use client";
import React from 'react';

export function FloatingFaces() {
  const faces = [
    { id: 1, img: "https://i.pravatar.cc/300?img=7", pos: "top-10 left-[5%]", delay: "" },
    { id: 2, img: "https://i.pravatar.cc/300?img=5", pos: "top-40 right-[10%]", delay: "animation-delay-2000" },
    { id: 3, img: "https://i.pravatar.cc/300?img=7", pos: "bottom-40 left-[10%]", delay: "animation-delay-4000" },
    { id: 4, img: "https://i.pravatar.cc/300?img=5", pos: "bottom-10 right-[5%]", delay: "animation-delay-2000" },
    { id: 5, img: "https://i.pravatar.cc/300?img=7", pos: "top-1/2 left-4", delay: "animation-delay-4000" },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 edson">
      {faces.map((face) => (
        <div
          key={face.id}
          className={`absolute ${face.pos} ${face.delay} animate-float opacity-40 md:opacity-60`}
        >
          <div className="w-20 h-20 md:w-28 md:h-28 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-green-100">
            <img
              src={face.img}
              alt="Noivos"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://ui-avatars.com/api/?name=Noivos&background=16a34a&color=fff";
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}