// models/Counter.js
// Atomic sequence counters (e.g. readable property codes). One document per sequence name.
import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // sequence name, e.g. "propertyCode"
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model("Counter", counterSchema);

/** Returns the next number of a sequence. Safe under concurrent requests ($inc is atomic). */
export const nextSequence = async (name, start = 1000) => {
  // Make sure the counter exists and starts at `start` (no-op if it is already there)
  await Counter.updateOne({ _id: name }, { $setOnInsert: { seq: start } }, { upsert: true });
  const doc = await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { new: true });
  return doc.seq;
};

export default Counter;
