const quotes = [
    "Stay hungry, stay foolish.",
    "Code is like humor. When you have to explain it, it’s bad.",
    "First, solve the problem. Then, write the code."
  ];
  
  const randomIndex = Math.floor(Math.random() * quotes.length);
  console.log("Quote of the day:", quotes[randomIndex]);
  