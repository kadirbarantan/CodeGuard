// Sayılara Türkçe ek: %34'ten, %94'e, %60'tan, %90'a ... (sayının okunuşundaki son kelimeye göre)
// [yönelme, ayrılma] ekleri
const BIRLER = { 1: ["'e", "'den"], 2: ["'ye", "'den"], 3: ["'e", "'ten"], 4: ["'e", "'ten"], 5: ["'e", "'ten"], 6: ["'ya", "'dan"], 7: ["'ye", "'den"], 8: ["'e", "'den"], 9: ["'a", "'dan"] }
const ONLAR = { 0: ["'a", "'dan"], 1: ["'a", "'dan"], 2: ["'ye", "'den"], 3: ["'a", "'dan"], 4: ["'a", "'tan"], 5: ["'ye", "'den"], 6: ["'a", "'tan"], 7: ["'e", "'ten"], 8: ["'e", "'den"], 9: ["'a", "'dan"] }

function ekler(n) {
  n = Math.abs(Math.round(n))
  if (n === 0) return ["'a", "'dan"] // sıfır
  if (n % 100 === 0) return ["'e", "'den"] // yüz
  if (n % 10 !== 0) return BIRLER[n % 10]
  return ONLAR[Math.floor(n / 10) % 10]
}

export const yonelme = (n) => n + ekler(n)[0] // %94'e
export const ayrilma = (n) => n + ekler(n)[1] // %34'ten
