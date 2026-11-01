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

const filters = {
  genre: "",
  year: null,
  director: "",
  sort: "default"
};

// ---------- Пункт 2: названия по алфавиту ----------

/**
 * Общая функция сортировки фильмов по названию.
 * Возвращает новый массив и не изменяет исходный.
 */
function sortMoviesByTitle(movies) {
  return [...movies].sort((a, b) => a.title.localeCompare(b.title, "ru"));
}

/**
 * Возвращает названия фильмов, отсортированные по алфавиту,
 * и выводит их в консоль.
 */
function showMovieTitles(movies) {
  const titles = sortMoviesByTitle(movies).map((movie) => movie.title);

  console.log(titles);
  return titles;
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
const addMovieDialog = document.getElementById("add-movie-dialog");
const openAddDialogButton = document.getElementById("open-add-dialog");
const closeAddDialogButton = document.getElementById("close-add-dialog");
const movieTitleInput = document.getElementById("movie-title");
const movieGenreInput = document.getElementById("movie-genre");
const movieDirectorInput = document.getElementById("movie-director");
const movieYearInput = document.getElementById("movie-year");
const formMessage = document.getElementById("form-message");
const libraryStatus = document.getElementById("library-status");
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
 * Показывает сообщение на странице после успешного добавления.
 */
function showLibraryStatus(text) {
  libraryStatus.textContent = text;
  libraryStatus.hidden = false;
}

/**
 * Открывает модальное окно добавления фильма.
 */
function openAddDialog() {
  formMessage.hidden = true;
  libraryStatus.hidden = true;
  addMovieDialog.showModal();
  movieTitleInput.focus();
}

/**
 * Закрывает модальное окно добавления фильма.
 */
function closeAddDialog() {
  addMovieDialog.close();
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
  resetFilters();
  formMessage.hidden = true;
  addMovieDialog.close();
  showLibraryStatus(`Фильм «${data.title}» добавлен.`);
}

addMovieForm.addEventListener("submit", handleAddMovie);
addMovieForm.addEventListener("input", () => {
  formMessage.hidden = true;
});
openAddDialogButton.addEventListener("click", openAddDialog);
closeAddDialogButton.addEventListener("click", closeAddDialog);
addMovieDialog.addEventListener("click", (event) => {
  if (event.target === addMovieDialog) {
    closeAddDialog();
  }
});
addMovieDialog.addEventListener("close", () => {
  openAddDialogButton.focus();
});

// ---------- Пункт 7: подборка и таблица ----------

const filterForm = document.getElementById("filter-form");
const filterGenreSelect = document.getElementById("filter-genre");
const filterYearInput = document.getElementById("filter-year");
const filterDirectorSelect = document.getElementById("filter-director");
const filterSortSelect = document.getElementById("filter-sort");
const resetFiltersButton = document.getElementById("reset-filters");
const filterMessage = document.getElementById("filter-message");
const moviesBody = document.getElementById("movies-body");
const moviesCounter = document.getElementById("movies-counter");

filterYearInput.max = String(currentYear);

/**
 * Применяет активные фильтры последовательно и возвращает видимые фильмы.
 */
function getVisibleMovies() {
  let result = movies;

  if (filters.genre) {
    result = filterByGenre(result, filters.genre);
  }

  if (filters.year !== null) {
    result = filterByYearAfter(result, filters.year);
  }

  if (filters.director) {
    result = filterByDirector(result, filters.director);
  }

  if (filters.sort === "title") {
    result = sortMoviesByTitle(result);
  }

  return result;
}

/**
 * Строит таблицу фильмов. Если ничего не найдено, показывает пустое состояние.
 */
function renderTable(list) {
  if (list.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.className = "movies-table__empty";
    cell.textContent = "Фильмы не найдены. Измените условия подбора.";
    row.append(cell);
    moviesBody.replaceChildren(row);
    return;
  }

  const rows = list.map((movie) => {
    const row = document.createElement("tr");
    const values = [movie.title, movie.genre, movie.director, String(movie.year)];

    values.forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    });

    return row;
  });

  moviesBody.replaceChildren(...rows);
}

/**
 * Обновляет счётчик показанных фильмов.
 */
function renderCounter(visibleCount) {
  const sortLabel = filters.sort === "title" ? " · по алфавиту" : "";
  moviesCounter.textContent = `Показано ${visibleCount} из ${movies.length}${sortLabel}`;
}

/**
 * Возвращает уникальные значения свойства, отсортированные по алфавиту.
 */
function getUniqueValues(key) {
  return [...new Set(movies.map((movie) => movie[key]))]
    .sort((a, b) => a.localeCompare(b, "ru"));
}

/**
 * Заполняет выпадающий список значениями и сохраняет текущий выбор.
 */
function fillFilterSelect(select, values, allLabel) {
  const currentValue = select.value;
  const options = [new Option(allLabel, "")];

  values.forEach((value) => {
    options.push(new Option(value, value));
  });

  select.replaceChildren(...options);
  select.value = values.includes(currentValue) ? currentValue : "";
}

/**
 * Обновляет списки жанров и режиссёров по текущей коллекции.
 */
function renderFilterOptions() {
  fillFilterSelect(filterGenreSelect, getUniqueValues("genre"), "Все жанры");
  fillFilterSelect(filterDirectorSelect, getUniqueValues("director"), "Все режиссёры");
}

/**
 * Перерисовывает список названий, таблицу, счётчик и элементы подбора.
 */
function renderAll() {
  const visibleMovies = getVisibleMovies();

  showMovieTitles(movies);
  renderTable(visibleMovies);
  renderCounter(visibleMovies.length);
  renderFilterOptions();
}

function showFilterMessage(text) {
  filterMessage.textContent = text;
  filterMessage.classList.add("is-error");
  filterMessage.hidden = false;
}

function clearFilterMessage() {
  filterMessage.textContent = "";
  filterMessage.classList.remove("is-error");
  filterMessage.hidden = true;
}

/**
 * Читает условия подбора и обновляет таблицу.
 */
function handleFilterSubmit(event) {
  event.preventDefault();

  const yearValue = filterYearInput.value.trim();
  let year = null;

  if (yearValue !== "") {
    year = Number(yearValue);

    if (!Number.isInteger(year) || year < 1888 || year > currentYear) {
      showFilterMessage(`Год должен быть целым числом от 1888 до ${currentYear}.`);
      return;
    }
  }

  clearFilterMessage();
  filters.genre = filterGenreSelect.value;
  filters.year = year;
  filters.director = filterDirectorSelect.value;
  filters.sort = filterSortSelect.value;

  const visibleMovies = getVisibleMovies();
  renderTable(visibleMovies);
  renderCounter(visibleMovies.length);
}

/**
 * Сбрасывает условия подбора и показывает полную коллекцию.
 */
function resetFilters() {
  filterForm.reset();
  filters.genre = "";
  filters.year = null;
  filters.director = "";
  filters.sort = "default";
  clearFilterMessage();
  renderAll();
}

filterForm.addEventListener("submit", handleFilterSubmit);
filterForm.addEventListener("input", clearFilterMessage);
filterForm.addEventListener("change", clearFilterMessage);
resetFiltersButton.addEventListener("click", resetFilters);

// ---------- Первая отрисовка ----------

renderAll();
