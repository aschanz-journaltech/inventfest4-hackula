import React from "react";
import "./Shayboard.css";
import {
  LineChart,
  Line,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
    ResponsiveContainer,
    ScatterChart,
    Scatter,
    ComposedChart,
    Bar
} from "recharts";

const data = [
  {
    name: 'Page A',
    storyPoint: 8,
    hour: 24,
  },
  {
    name: 'Page B',
    storyPoint: 13,
    hour: 60,
  },
  {
    name: 'Page C',
    storyPoint: 8,
    hour: 40,
  },
  {
    name: 'Page D',
    storyPoint: 5,
    hour: 23,
  },
  {
    name: 'Page E',
    storyPoint: 3,
    hour: 14,
  },
  {
    name: 'Page F',
    storyPoint: 2,
    hour: 10,
  },
  {
    name: 'Page G',
    storyPoint: 1,
    hour: 5,
  },
];

const n = data.length;
const sumX = data.reduce((s, d) => s + d.storyPoint, 0);
const sumY = data.reduce((s, d) => s + d.hour, 0);
const sumXY = data.reduce((s, d) => s + d.storyPoint * d.hour, 0);
const sumX2 = data.reduce((s, d) => s + d.storyPoint ** 2, 0);
const a = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX ** 2);
const b = (sumY - a * sumX) / n;

// Create line points
const trendLine = [
  { storyPoint: Math.min(...data.map(d => d.storyPoint)), hour: a * Math.min(...data.map(d => d.storyPoint)) + b },
  { storyPoint: Math.max(...data.map(d => d.storyPoint)), hour: a * Math.max(...data.map(d => d.storyPoint)) + b },
];



export const Shayboard: React.FC = () => {
  return (
    <div className="shayboard-root">
      <div className="shayboard">
        <header className="shayboard-header">
          <h1>Shayboard</h1>
          <p className="muted">Simple development dashboard</p>
        </header>

        <main className="shayboard-content">
          <p>This is the Shayboard file. Add playground widgets here.</p>
          <ul>
            <li>Quick links</li>
            <li>Data visualizations</li>
            <li>Experimentation area</li>
          </ul>
        </main>
      </div>

      <div className="shayboard-chart">
        <LineChart
          style={{ width: "100%", maxWidth: "700px", maxHeight: "70vh", aspectRatio: 1.618 }}
          data={data}
          margin={{
            top: 5,
            right: 0,
            left: 0,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis width={60} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="hour" stroke="#8884d8" activeDot={{ r: 8 }} />
          <Line type="monotone" dataKey="storyPoint" stroke="#82ca9d" />
        </LineChart>
         <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis yAxisId="left" orientation="left" label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
        <YAxis yAxisId="right" orientation="right" label={{ value: 'Story Points', angle: 90, position: 'insideRight' }} />
        <Tooltip />
        <Legend />
        <Bar yAxisId="left" dataKey="hour" fill="#82ca9d" name="Hours Logged" />
        <Line yAxisId="right" type="monotone" dataKey="storyPoint" stroke="#8884d8" name="Story Points" />
      </ComposedChart>
    </ResponsiveContainer>
     <ResponsiveContainer width="100%" height={400}>
      <ScatterChart>
        <CartesianGrid />
        <XAxis type="number" dataKey="storyPoint" name="Story Points" />
        <YAxis type="number" dataKey="hour" name="Hours Logged" />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        <Scatter data={data} fill="#8884d8" />
      </ScatterChart>
    </ResponsiveContainer>
     <ResponsiveContainer width="100%" height={400}>
      <ScatterChart>
        <CartesianGrid />
        <XAxis type="number" dataKey="storyPoint" name="Story Points" />
        <YAxis type="number" dataKey="hour" name="Hours Logged" />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />

        <Scatter data={data} fill="#8884d8" />

        {/* Trendline */}
        <Line type="linear" dataKey="hour" data={trendLine} stroke="red" dot={false} />
      </ScatterChart>
    </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Shayboard;
