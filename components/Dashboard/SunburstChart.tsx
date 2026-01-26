
import React, { useState, useMemo } from 'react';
import { RegistrationsMap } from '../../types';

interface SunburstChartProps {
  registrations: RegistrationsMap;
}

interface Segment {
  id: string;
  name: string;
  value: number;
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  color: string;
  type: 'root' | 'type' | 'category';
}

const SunburstChart: React.FC<SunburstChartProps> = ({ registrations }) => {
  const [hovered, setHovered] = useState<Segment | null>(null);

  const data = useMemo(() => {
    const hierarchy = {
      total: 0,
      types: {
        'Sekolah Kebangsaan': { total: 0, categories: {} as Record<string, number> },
        'Sekolah Menengah': { total: 0, categories: {} as Record<string, number> }
      }
    };

    Object.values(registrations).forEach(reg => {
      const typeKey = reg.schoolType === 'Sekolah Kebangsaan' ? 'Sekolah Kebangsaan' : 'Sekolah Menengah';
      reg.students.forEach(student => {
        hierarchy.total++;
        hierarchy.types[typeKey].total++;
        hierarchy.types[typeKey].categories[student.category] = (hierarchy.types[typeKey].categories[student.category] || 0) + 1;
      });
    });

    const segments: Segment[] = [];
    let currentTypeAngle = 0;

    Object.entries(hierarchy.types).forEach(([typeName, typeData]) => {
      if (typeData.total === 0) return;

      const typeSweep = (typeData.total / hierarchy.total) * 360;
      const typeStart = currentTypeAngle;
      const typeEnd = currentTypeAngle + typeSweep;
      const color = typeName === 'Sekolah Kebangsaan' ? '#ea580c' : '#1e293b';

      segments.push({
        id: typeName,
        name: typeName,
        value: typeData.total,
        startAngle: typeStart,
        endAngle: typeEnd,
        innerRadius: 70,
        outerRadius: 115,
        color,
        type: 'type'
      });

      let currentCatAngle = typeStart;
      Object.entries(typeData.categories).sort().forEach(([catName, catVal]) => {
        const catSweep = (catVal / typeData.total) * typeSweep;
        const catStart = currentCatAngle;
        const catEnd = currentCatAngle + catSweep;
        
        const catColor = typeName === 'Sekolah Kebangsaan' 
          ? `rgba(234, 88, 12, ${0.5 + (Math.random() * 0.3)})` 
          : `rgba(30, 41, 59, ${0.5 + (Math.random() * 0.3)})`;

        segments.push({
          id: `${typeName}-${catName}`,
          name: catName,
          value: catVal,
          startAngle: catStart,
          endAngle: catEnd,
          innerRadius: 120,
          outerRadius: 165,
          color: catColor,
          type: 'category'
        });

        currentCatAngle = catEnd;
      });

      currentTypeAngle = typeEnd;
    });

    return { hierarchy, segments };
  }, [registrations]);

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle - 0.1);
    const end = polarToCartesian(x, y, radius, startAngle + 0.1);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
  };

  if (data.hierarchy.total === 0) return (
    <div className="text-center py-10 text-slate-300 italic text-xs uppercase tracking-widest border-2 border-dashed rounded-full aspect-square flex items-center justify-center w-[300px]">
      Tiada Data
    </div>
  );

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative w-full max-w-[380px] aspect-square group">
        <svg viewBox="0 0 400 400" className="w-full h-full drop-shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]">
          {data.segments.map((seg) => {
            const isHovered = hovered?.id === seg.id;
            const pathData = [
              describeArc(200, 200, seg.outerRadius, seg.startAngle, seg.endAngle),
              "L", polarToCartesian(200, 200, seg.innerRadius, seg.startAngle + 0.1).x, polarToCartesian(200, 200, seg.innerRadius, seg.startAngle + 0.1).y,
              describeArc(200, 200, seg.innerRadius, seg.endAngle, seg.startAngle).replace('M', 'A').split('A').slice(1).join('A'),
              "Z"
            ].join(" ");

            return (
              <path
                key={seg.id}
                d={pathData}
                fill={seg.color}
                className="transition-all duration-300 cursor-pointer hover:opacity-90"
                style={{
                  filter: isHovered ? 'brightness(1.2)' : 'none',
                  opacity: hovered && !isHovered ? 0.3 : 1
                }}
                onMouseEnter={() => setHovered(seg)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
          
          <circle cx="200" cy="200" r="65" fill="white" className="shadow-inner" />
          <text x="200" y="195" textAnchor="middle" className="fill-slate-400 text-[9px] font-black uppercase tracking-widest">JUMLAH</text>
          <text x="200" y="222" textAnchor="middle" className="fill-slate-800 text-4xl font-black">{data.hierarchy.total}</text>
        </svg>

        {hovered && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center z-10 animate-scaleIn">
             <div className="bg-white/95 backdrop-blur-md px-5 py-3 rounded-2xl shadow-2xl border border-slate-100 min-w-[140px]">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{hovered.name}</p>
                <p className="text-2xl font-black text-slate-800">{hovered.value}</p>
                <p className="text-[8px] font-bold text-orange-600 uppercase mt-1">
                  {((hovered.value / data.hierarchy.total) * 100).toFixed(1)}% Peserta
                </p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SunburstChart;
