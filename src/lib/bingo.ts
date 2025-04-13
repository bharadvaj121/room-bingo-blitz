
// Generate a shuffled board of numbers 1-25
export const generateBingoBoard = (): number[] => {
  const numbers: number[] = Array.from({ length: 25 }, (_, i) => i + 1);
  
  // Shuffle the array using Fisher-Yates algorithm
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  
  return numbers;
};

// Check how many lines have been completed
export const checkWin = (markedCells: boolean[]): number => {
  // Define all possible winning lines (rows, columns, and diagonals)
  const winningLines = [
    // Rows
    [0, 1, 2, 3, 4],
    [5, 6, 7, 8, 9],
    [10, 11, 12, 13, 14],
    [15, 16, 17, 18, 19],
    [20, 21, 22, 23, 24],
    
    // Columns
    [0, 5, 10, 15, 20],
    [1, 6, 11, 16, 21],
    [2, 7, 12, 17, 22],
    [3, 8, 13, 18, 23],
    [4, 9, 14, 19, 24],
    
    // Diagonals
    [0, 6, 12, 18, 24], // Top-left to bottom-right
    [4, 8, 12, 16, 20]  // Top-right to bottom-left
  ];
  
  // Count how many winning lines have been completed
  let completedLines = 0;
  
  for (const line of winningLines) {
    if (line.every(index => markedCells[index])) {
      completedLines++;
    }
  }
  
  return completedLines;
};
