/**
 * Configuration for post reactions
 * 
 * Each reaction has:
 * - type: Unique identifier for the reaction
 * - emoji: The emoji to display
 * - label: Text label for the reaction
 * - description: Tooltip description for the reaction
 * - order: Display order (lower numbers first)
 */
const REACTIONS = [
  {
    type: 'love',
    emoji: '❤️',
    label: 'Love',
    description: 'I love this!',
    order: 1
  },
  {
    type: 'insightful',
    emoji: '💡',
    label: 'Insightful',
    description: 'This is thought-provoking!',
    order: 2
  },
  {
    type: 'agree',
    emoji: '👍',
    label: 'Agree',
    description: 'I agree with this',
    order: 3
  },
  {
    type: 'disagree',
    emoji: '👎',
    label: 'Disagree',
    description: 'I respectfully disagree',
    order: 4
  },
  {
    type: 'curious',
    emoji: '🤔',
    label: 'Curious',
    description: 'This made me think',
    order: 5
  }
];

module.exports = REACTIONS;
