import { ASLGlossItem, VoiceOption } from "./types";

export const VOICE_OPTIONS: VoiceOption[] = [
  { id: "Zephyr", name: "Zephyr", gender: "Female", description: "Warm and clear" },
  { id: "Kore", name: "Kore", gender: "Female", description: "Bright and professional" },
  { id: "Puck", name: "Puck", gender: "Male", description: "Deep and natural" },
  { id: "Charon", name: "Charon", gender: "Male", description: "Calm and composed" },
  { id: "Fenrir", name: "Fenrir", gender: "Male", description: "Bold and warm" },
];

export const ASL_DICTIONARY: ASLGlossItem[] = [
  // Greetings
  { gloss: "HELLO", label: "Hello", category: "greetings", emoji: "👋", description: "Flat hand moves outward from forehead like a salute" },
  { gloss: "GOODBYE", label: "Goodbye", category: "greetings", emoji: "👋", description: "Open hand waving from open position to closed fingers" },
  { gloss: "THANK_YOU", label: "Thank You", category: "greetings", emoji: "🙏", description: "Flat hand moves from chin downward towards the person" },
  { gloss: "PLEASE", label: "Please", category: "greetings", emoji: "🥺", description: "Flat hand rubs chest in a circular motion" },
  { gloss: "SORRY", label: "Sorry", category: "greetings", emoji: "😔", description: "Fist rubs chest in a circular motion" },
  { gloss: "EXCUSE_ME", label: "Excuse Me", category: "greetings", emoji: "💁", description: "Fingertips of one hand swipe across the palm of the other" },

  // Pronouns
  { gloss: "I", label: "I / Me", category: "pronouns", emoji: "👆", description: "Point index finger at chest" },
  { gloss: "YOU", label: "You", category: "pronouns", emoji: "👉", description: "Point index finger forward at the person" },
  { gloss: "HE_SHE", label: "He / She / It", category: "pronouns", emoji: "👉", description: "Point index finger to the side" },
  { gloss: "WE", label: "We", category: "pronouns", emoji: "👥", description: "Point finger to dominant shoulder, swing in an arc to non-dominant shoulder" },
  { gloss: "THEY", label: "They", category: "pronouns", emoji: "👥", description: "Point finger forward and sweep to the side" },
  { gloss: "MY", label: "My / Mine", category: "pronouns", emoji: "🤚", description: "Flat hand pressed against chest" },
  { gloss: "YOUR", label: "Your", category: "pronouns", emoji: "🫱", description: "Flat hand pushed forward towards the other person" },

  // Actions
  { gloss: "WANT", label: "Want", category: "actions", emoji: "🤲", description: "Both hands open palms up, claw slightly and pull towards body" },
  { gloss: "LIKE", label: "Like", category: "actions", emoji: "❤️", description: "Thumb and middle finger pinch together as you pull hand forward from chest" },
  { gloss: "GO", label: "Go", category: "actions", emoji: "🚶", description: "Both index fingers point forward/outward in a swinging motion" },
  { gloss: "COME", label: "Come", category: "actions", emoji: "🏃", description: "Both index fingers roll in towards the chest" },
  { gloss: "EAT", label: "Eat", category: "actions", emoji: "🍎", description: "Flattened O-hand taps lips once or twice" },
  { gloss: "DRINK", label: "Drink", category: "actions", emoji: "🥛", description: "C-hand moves toward mouth like drinking from a cup" },
  { gloss: "HELP", label: "Help", category: "actions", emoji: "🤝", description: "Thumbs-up hand resting on open flat palm, moving up together" },
  { gloss: "LEARN", label: "Learn", category: "actions", emoji: "🧠", description: "Take information from flat palm and press it to the forehead" },
  { gloss: "SEE", label: "See", category: "actions", emoji: "👀", description: "V-hand points from eyes forward" },
  { gloss: "HAVE", label: "Have", category: "actions", emoji: "📦", description: "Both bent hands tap fingertips against chests" },

  // Objects
  { gloss: "WATER", label: "Water", category: "objects", emoji: "💧", description: "W-hand taps index finger against chin" },
  { gloss: "FOOD", label: "Food", category: "objects", emoji: "🍔", description: "Double-tap flat O-hand against lips" },
  { gloss: "BOOK", label: "Book", category: "objects", emoji: "📖", description: "Two flat palms closed together, then opened like a book" },
  { gloss: "PHONE", label: "Phone", category: "objects", emoji: "📱", description: "Y-hand held to ear like a telephone" },
  { gloss: "CAR", label: "Car", category: "objects", emoji: "🚗", description: "Two fists steering an invisible wheel" },
  { gloss: "HOME", label: "Home", category: "objects", emoji: "🏠", description: "Flat O-hand taps chin then taps cheek near ear" },
  { gloss: "SCHOOL", label: "School", category: "objects", emoji: "🏫", description: "Clap flat hands together crosswise twice" },
  { gloss: "FRIEND", label: "Friend", category: "objects", emoji: "🤝", description: "Hook index fingers together, then reverse hook" },
  { gloss: "FAMILY", label: "Family", category: "objects", emoji: "👨‍👩‍👧‍👦", description: "F-hands touch thumbs/index fingers, draw a horizontal circle to meet at pinkies" },

  // Common/Refinements
  { gloss: "YES", label: "Yes", category: "common", emoji: "👍", description: "S-hand (fist) nods forward and backward" },
  { gloss: "NO", label: "No", category: "common", emoji: "👎", description: "Index and middle fingers tap down against the thumb" },
  { gloss: "MORE", label: "More", category: "common", emoji: "➕", description: "Flat O-hands tap fingertips together twice" },
  { gloss: "GOOD", label: "Good", category: "common", emoji: "✨", description: "Flat hand moves from chin to flat receiving palm" },
  { gloss: "BAD", label: "Bad", category: "common", emoji: "⚠️", description: "Flat hand moves from chin, flips palm down towards floor" },
  { gloss: "HAPPY", label: "Happy", category: "common", emoji: "😊", description: "Flat hands brush chest in upward circular patterns" },
  { gloss: "SAD", label: "Sad", category: "common", emoji: "😢", description: "Both hands open, fingers spread, pass downward over face" },
  { gloss: "WHERE", label: "Where", category: "common", emoji: "❓", description: "Shake index finger side to side" },
  { gloss: "WHY", label: "Why", category: "common", emoji: "🤔", description: "Touch forehead with flat hand, pull away into a Y-hand at side" },
  { gloss: "WHEN", label: "When", category: "common", emoji: "🕒", description: "Index finger of dominant hand draws a circle around non-dominant index finger tip" },

  // Alphabet (Finger-spelling helpers)
  ...Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ").map((letter) => ({
    gloss: letter,
    label: `Letter ${letter}`,
    category: "alphabet" as const,
    emoji: "🤚",
    description: `ASL finger-spelled character '${letter}'`
  }))
];
