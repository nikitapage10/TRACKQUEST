export interface SparkPrompt {
  id: string;
  text: string;
  pain?: 'steam' | 'tweak' | 'time' | 'arrange';
}

export const SPARKS: SparkPrompt[] = [
  { id: 's1', text: 'Open your oldest idea and just listen.', pain: 'steam' },
  { id: 's2', text: 'Rename one project file honestly.', pain: 'tweak' },
  { id: 's3', text: '8 bars, wrong genre, go.' },
  { id: 's4', text: "Hum tomorrow's melody into a memo.", pain: 'time' },
  { id: 's5', text: 'Map the arrangement of a song you love.', pain: 'arrange' },
  { id: 's6', text: 'Mute your favorite track element. Better?' },
  { id: 's7', text: 'Set a 10-minute timer. One problem only.', pain: 'time' },
  { id: 's8', text: 'Write one honest line about {song}.' },
  { id: 's9', text: 'Steal a drum groove. Legally. Spiritually.' },
  { id: 's10', text: 'Play your latest bounce in a different room.', pain: 'tweak' },
  { id: 's11', text: 'Delete something you\'re keeping "just in case."', pain: 'tweak' },
  { id: 's12', text: 'Loop your best 4 bars. Why do they work?' },
  { id: 's13', text: 'Sketch a chorus with only 3 notes.', pain: 'arrange' },
  { id: 's14', text: 'Voice-memo review: play your seed for {song}.', pain: 'steam' },
  { id: 's15', text: 'Make the worst beat you can. On purpose.' },
  { id: 's16', text: 'Find one reference for your current stage.' },
  { id: 's17', text: 'Turn everything down 6dB. Listen again.' },
  { id: 's18', text: 'Write the last line of the song first.', pain: 'arrange' },
  { id: 's19', text: 'One-minute clean-up: close old tabs/projects.' },
  { id: 's20', text: "Tell someone what you're working on." },
];
