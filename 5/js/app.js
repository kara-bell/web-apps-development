"use strict";

// ---------- Данные ----------

/**
 * Исходная коллекция фильмов.
 * Соответствие свойствам задания:
 * title — название, genre — жанр, director — режиссёр, year — год выпуска.
 */
const initialMovies = [
  {
    title: "Иван Васильевич меняет профессию",
    genre: "комедия",
    director: "Леонид Гайдай",
    year: 1973
  },
  {
    title: "Москва слезам не верит",
    genre: "драма",
    director: "Владимир Меньшов",
    year: 1979
  },
  {
    title: "Солярис",
    genre: "фантастика",
    director: "Андрей Тарковский",
    year: 1972
  },
  {
    title: "Служебный роман",
    genre: "комедия",
    director: "Эльдар Рязанов",
    year: 1977
  },
  {
    title: "Сталкер",
    genre: "фантастика",
    director: "Андрей Тарковский",
    year: 1979
  },
  {
    title: "Берегись автомобиля",
    genre: "комедия",
    director: "Эльдар Рязанов",
    year: 1966
  },
  {
    title: "Летят журавли",
    genre: "драма",
    director: "Михаил Калатозов",
    year: 1957
  },
  {
    title: "Кин-дза-дза!",
    genre: "фантастика",
    director: "Георгий Данелия",
    year: 1986
  },
  {
    title: "Осенний марафон",
    genre: "драма",
    director: "Георгий Данелия",
    year: 1979
  },
  {
    title: "Интерстеллар",
    genre: "фантастика",
    director: "Кристофер Нолан",
    year: 2014
  }
];

let movies = [...initialMovies];

// ---------- Пункт 2: названия по алфавиту ----------

const titleList = document.getElementById("title-list");

/**
 * Возвращает названия фильмов, отсортированные по алфавиту,
 * и выводит их в консоль.
 */
function showMovieTitles(movies) {
  const titles = movies
    .map((movie) => movie.title)
    .sort((a, b) => a.localeCompare(b, "ru"));

  console.log(titles);
  return titles;
}

/**
 * Выводит названия в упорядоченный список на странице.
 */
function renderTitleList(titles) {
  const items = titles.map((title) => {
    const item = document.createElement("li");
    item.textContent = title;
    return item;
  });

  titleList.replaceChildren(...items);
}

// ---------- Пункты 3–5: фильтрация ----------

/**
 * Возвращает фильмы указанного жанра.
 * Пустой жанр возвращает копию исходного массива.
 */
function filterByGenre(movies, genre) {
  const query = String(genre).trim().toLowerCase();
  if (!query) {
    return [...movies];
  }

  return movies.filter(
    (movie) => movie.genre.trim().toLowerCase() === query
  );
}

/**
 * Возвращает фильмы, выпущенные строго после указанного года.
 */
function filterByYearAfter(movies, year) {
  if (year === null || year === undefined || year === "") {
    return [...movies];
  }

  const threshold = Number(year);
  if (!Number.isFinite(threshold)) {
    return [];
  }

  return movies.filter((movie) => movie.year > threshold);
}

/**
 * Возвращает фильмы указанного режиссёра.
 * Пустой режиссёр возвращает копию исходного массива.
 */
function filterByDirector(movies, director) {
  const query = String(director).trim().toLowerCase();
  if (!query) {
    return [...movies];
  }

  return movies.filter(
    (movie) => movie.director.trim().toLowerCase() === query
  );
}

// ---------- Пункт 6: добавление фильма ----------

const addMovieForm = document.getElementById("add-movie-form");
const movieTitleInput = document.getElementById("movie-title");
const movieGenreInput = document.getElementById("movie-genre");
const movieDirectorInput = document.getElementById("movie-director");
const movieYearInput = document.getElementById("movie-year");
const formMessage = document.getElementById("form-message");
const currentYear = new Date().getFullYear();

movieYearInput.max = String(currentYear);

/**
 * Читает значения полей формы и убирает пробелы по краям.
 */
function readFormData() {
  return {
    title: movieTitleInput.value.trim(),
    genre: movieGenreInput.value.trim(),
    director: movieDirectorInput.value.trim(),
    year: movieYearInput.value.trim()
  };
}

/**
 * Проверяет данные формы.
 * Возвращает текст ошибки или пустую строку, если данные корректны.
 */
function validateMovie(data) {
  if (!data.title || !data.genre || !data.director || !data.year) {
    return "Заполните название, жанр, режиссёра и год выпуска.";
  }

  const year = Number(data.year);

  if (!Number.isInteger(year)) {
    return "Год выпуска должен быть целым числом.";
  }

  if (year < 1888 || year > currentYear) {
    return `Год выпуска должен быть от 1888 до ${currentYear}.`;
  }

  return "";
}

/**
 * Показывает сообщение формы.
 */
function showFormMessage(text, isError) {
  formMessage.textContent = text;
  formMessage.classList.toggle("is-error", isError);
  formMessage.classList.toggle("is-success", !isError);
  formMessage.hidden = false;
}

/**
 * Добавляет фильм в массив, обновляет список названий и очищает форму.
 */
function handleAddMovie(event) {
  event.preventDefault();

  const data = readFormData();
  const error = validateMovie(data);

  if (error) {
    showFormMessage(error, true);
    return;
  }

  movies.push({
    title: data.title,
    genre: data.genre,
    director: data.director,
    year: Number(data.year)
  });

  addMovieForm.reset();
  renderTitleList(showMovieTitles(movies));
  showFormMessage(`Фильм «${data.title}» добавлен.`, false);
  movieTitleInput.focus();
}

addMovieForm.addEventListener("submit", handleAddMovie);
addMovieForm.addEventListener("input", () => {
  formMessage.hidden = true;
});

// ---------- Первая отрисовка ----------

renderTitleList(showMovieTitles(movies));
