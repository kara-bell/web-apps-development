/* QualityHub — клиентский интерактив.
   Меню, табы, модальное окно и валидация формы. Без внешних зависимостей. */

(() => {
  "use strict";

  /* ---------- Мобильное меню ---------- */

  const burger = document.querySelector(".burger");
  const nav = document.getElementById("primary-nav");

  if (burger && nav) {
    const navLinks = nav.querySelectorAll("a");

    const setMenu = (open, restoreFocus = true) => {
      nav.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");

      if (open) {
        const firstLink = nav.querySelector("a");
        if (firstLink) firstLink.focus();
      } else if (restoreFocus) {
        burger.focus();
      }
    };

    burger.addEventListener("click", () => {
      setMenu(!nav.classList.contains("is-open"));
    });

    navLinks.forEach((link) => {
      link.addEventListener("click", () => setMenu(false, false));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        setMenu(false);
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 900 && nav.classList.contains("is-open")) {
        setMenu(false, false);
      }
    });
  }

  /* ---------- Логотип: прокрутка к началу ---------- */

  const logo = document.querySelector(".logo");

  if (logo) {
    logo.addEventListener("click", (event) => {
      event.preventDefault();
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      window.scrollTo({
        top: 0,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    });
  }

  /* ---------- Табы характеристик ---------- */

  document.querySelectorAll('[role="tablist"]').forEach((list) => {
    const tabs = Array.from(list.querySelectorAll('[role="tab"]'));
    if (!tabs.length) return;

    const activate = (index, focus) => {
      tabs.forEach((tab, i) => {
        const selected = i === index;
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;

        const panel = document.getElementById(tab.getAttribute("aria-controls"));
        if (panel) panel.hidden = !selected;
      });

      if (focus) tabs[index].focus();
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => activate(index));

      tab.addEventListener("keydown", (event) => {
        let next = null;

        if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
        else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = tabs.length - 1;

        if (next !== null) {
          event.preventDefault();
          activate(next, true);
        }
      });
    });

    activate(0, false);
  });

  /* ---------- Модальное окно с видео ---------- */

  const modal = document.getElementById("video-modal");
  const openVideo = document.querySelector(".video-card__play");

  if (modal && openVideo) {
    const closeButton = modal.querySelector(".modal__close");
    const video = modal.querySelector("video");

    const openModal = () => {
      if (modal.open) return;
      document.body.classList.add("modal-open");
      modal.showModal();

      if (video) {
        video.play().catch(() => {
          /* Автозапуск может быть запрещён — пользователь нажмёт Play сам. */
        });
      }
    };

    const closeModal = () => modal.close();

    openVideo.addEventListener("click", openModal);
    if (closeButton) closeButton.addEventListener("click", closeModal);

    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });

    modal.addEventListener("close", () => {
      document.body.classList.remove("modal-open");

      if (video) {
        video.pause();
        try {
          video.currentTime = 0;
        } catch {
          /* Метаданные ещё не загрузились — сбрасывать нечего. */
        }
      }

      openVideo.focus();
    });
  }

  /* ---------- Валидация формы ---------- */

  const form = document.getElementById("request-form");

  if (form) {
    form.noValidate = true;

    const status = form.querySelector(".form__status");
    const requiredFields = Array.from(form.querySelectorAll("[required]"));
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const messageFor = (field) => {
      if (field.type === "checkbox") {
        return field.checked ? "" : "Подтвердите согласие на обработку данных";
      }

      const value = field.value.trim();

      if (!value) {
        return field.id === "email" ? "Введите e-mail" : "Введите имя";
      }

      if (field.type === "email" && !emailPattern.test(value)) {
        return "Введите адрес вида name@example.com";
      }

      return "";
    };

    const clearError = (field) => {
      field.removeAttribute("aria-invalid");
      field.removeAttribute("aria-describedby");

      const fieldWrap = field.closest(".form__field");
      const error = fieldWrap ? fieldWrap.querySelector(".form__error") : null;
      if (error) error.remove();
    };

    const showError = (field, message) => {
      clearError(field);

      const fieldWrap = field.closest(".form__field");
      if (!fieldWrap) return;

      const error = document.createElement("span");
      error.className = "form__error";
      error.id = field.id + "-error";
      error.textContent = message;

      fieldWrap.appendChild(error);
      field.setAttribute("aria-invalid", "true");
      field.setAttribute("aria-describedby", error.id);
    };

    const setStatus = (message, type = "") => {
      status.textContent = message;
      status.className = "form__status" + (type ? " form__status--" + type : "");
    };

    requiredFields.forEach((field) => {
      const eventName = field.type === "checkbox" ? "change" : "input";

      field.addEventListener(eventName, () => {
        clearError(field);
        if (status.classList.contains("form__status--error")) setStatus("");
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      let firstInvalid = null;

      requiredFields.forEach((field) => {
        const message = messageFor(field);

        if (message) {
          showError(field, message);
          if (!firstInvalid) firstInvalid = field;
        } else {
          clearError(field);
        }
      });

      if (firstInvalid) {
        setStatus("Проверьте выделенные поля.", "error");
        firstInvalid.focus();
        return;
      }

      form.reset();
      requiredFields.forEach(clearError);
      setStatus("Спасибо! Заявка отправлена. Это демонстрационный режим — данные не передаются.", "success");
    });
  }
})();
