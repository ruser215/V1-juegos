import { expect, test } from "@playwright/test";

function uniqueUser() {
  const id = `${Date.now()}${Math.floor(Math.random() * 10000)}`;
  return {
    username: `e2e_user_${id}`,
    email: `e2e_${id}@mail.com`,
    password: "clave123"
  };
}

function uniqueGameName() {
  return `E2E Juego ${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function listadoCards(page) {
  return page.locator(".MuiCard-root").filter({
    has: page.getByRole("link", { name: "Ver más" })
  });
}

async function register(page, user) {
  await page.goto("/register");
  await page.getByLabel("Nombre de usuario").fill(user.username);
  await page.getByLabel("Correo electrónico").fill(user.email);
  await page.getByLabel("Contraseña").fill(user.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/juegos$/);
}

async function login(page, user) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(user.email);
  await page.getByLabel("Contraseña").fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/juegos$/);
}

async function activarFiltroQueCambieResultados(groupCheckboxes, cards) {
  const baseCount = await cards.count();
  const total = await groupCheckboxes.count();

  for (let i = 0; i < total; i += 1) {
    const checkbox = groupCheckboxes.nth(i);
    await checkbox.check();

    let changed = false;
    try {
      await expect
        .poll(async () => cards.count(), { timeout: 2000 })
        .not.toBe(baseCount);
      changed = true;
    } catch {
      changed = false;
    }

    if (changed) {
      const filteredCount = await cards.count();
      await checkbox.uncheck();
      await expect.poll(async () => cards.count()).toBe(baseCount);
      return filteredCount;
    }

    await checkbox.uncheck();
  }

  return null;
}

test("Registro de usuario y acceso autenticado", async ({ page }) => {
  const user = uniqueUser();

  await register(page, user);
  await expect(page.getByText(`Usuario: ${user.username}`)).toBeVisible();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();

  await login(page, user);
  await expect(page.getByText(`Usuario: ${user.username}`)).toBeVisible();
});

test("Login incorrecto muestra error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill("nadie@mail.com");
  await page.getByLabel("Contraseña").fill("mala123");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("alert")).toContainText(/credenciales|iniciar sesión|inválid/i);
  await expect(page).toHaveURL(/\/login$/);
});

test("Ruta protegida redirige a login sin sesión (/mis-juegos)", async ({ page }) => {
  await page.goto("/mis-juegos");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
});

test("Listado de videojuegos renderiza nombre, portada y precio", async ({ page }) => {
  await page.goto("/juegos");

  const gameCards = listadoCards(page);
  await expect(gameCards.first()).toBeVisible();
  await expect(gameCards.locator("h6").first()).toBeVisible();
  await expect(page.locator(".MuiCard-root img").first()).toBeVisible();
  await expect(gameCards.first().getByText(/€\s*\d/)).toBeVisible();
});

test("Búsqueda filtra el listado", async ({ page }) => {
  await page.goto("/juegos");

  const cards = listadoCards(page);
  const initialCount = await cards.count();
  expect(initialCount).toBeGreaterThan(0);

  const firstTitle = await cards.first().locator("h6").first().innerText();
  const term = firstTitle.split(" ").find((part) => part.length >= 4) || firstTitle.slice(0, 4);

  await page.getByLabel("Buscar juego").fill(term);
  await expect(cards.first()).toBeVisible();

  const filteredCount = await cards.count();
  expect(filteredCount).toBeLessThanOrEqual(initialCount);

  const titlesText = await cards.locator("h6").allInnerTexts();
  const anyMatch = titlesText.some((title) =>
    title.toLowerCase().includes(term.toLowerCase())
  );
  expect(anyMatch).toBeTruthy();
});

test("Filtros por categorías y plataformas cambian resultados", async ({ page }) => {
  await page.goto("/juegos");

  const cards = listadoCards(page);
  await expect(cards.first()).toBeVisible();

  const categoriasChecks = page.locator(
    "xpath=//h6[normalize-space()='Categorías']/following-sibling::div[1]//input[@type='checkbox']"
  );
  const plataformasChecks = page.locator(
    "xpath=//h6[normalize-space()='Plataformas']/following-sibling::div[1]//input[@type='checkbox']"
  );

  await expect(categoriasChecks.first()).toBeVisible();
  await expect(plataformasChecks.first()).toBeVisible();

  const countConCategoria = await activarFiltroQueCambieResultados(categoriasChecks, cards);
  expect(countConCategoria).not.toBeNull();

  const countConPlataforma = await activarFiltroQueCambieResultados(plataformasChecks, cards);
  expect(countConPlataforma).not.toBeNull();
});

test("Paginación cambia elementos y página activa", async ({ page }) => {
  await page.goto("/juegos");

  const cards = listadoCards(page);
  await expect(cards.first()).toBeVisible();

  await page.getByLabel("Juegos por página").click();
  await page.getByRole("option", { name: "4" }).click();

  const pageTwoButton = page.getByRole("button", { name: "2" });
  await expect(pageTwoButton).toBeVisible();

  const pageOneTitles = await cards.locator("h6").allInnerTexts();

  await pageTwoButton.click();
  await expect(page.locator(".MuiPaginationItem-page.Mui-selected")).toHaveText("2");

  const pageTwoTitles = await cards.locator("h6").allInnerTexts();
  expect(pageTwoTitles.join("|")).not.toBe(pageOneTitles.join("|"));
});

test("Crear videojuego aparece en mis videojuegos", async ({ page }) => {
  const user = uniqueUser();
  const gameName = uniqueGameName();

  await register(page, user);
  await page.goto("/juegos/nuevo");

  await page.getByLabel("Nombre").fill(gameName);
  await page.getByLabel("Descripción").fill("Videojuego creado en prueba E2E");
  await page.getByLabel("Fecha lanzamiento (YYYY-MM-DD)").fill("2026-02-22");
  await page.getByLabel("Compañía").fill("Studio E2E");
  await page.getByLabel("Precio").fill("19.99");
  await page.getByLabel("URL portada").fill("https://picsum.photos/300/200");
  await page.getByLabel("URL video").fill("https://youtu.be/dQw4w9WgXcQ");
  await page.getByLabel("Categorías IDs separadas por coma (ej: 1,2)").fill("1");
  await page.getByLabel("Plataformas IDs separadas por coma (ej: 1,3)").fill("1");
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page).toHaveURL(/\/mis-juegos$/);
  await expect(page.getByText(gameName)).toBeVisible();
});

test("Ver detalle muestra campos clave", async ({ page }) => {
  await page.goto("/juegos");

  await page.getByRole("link", { name: "Ver más" }).first().click();
  await expect(page).toHaveURL(/\/juegos\/\d+$/);

  await expect(page.getByText("Añadido por:")).toBeVisible();
  await expect(page.getByText("Compañía:")).toBeVisible();
  await expect(page.getByText("Precio:")).toBeVisible();
  await expect(page.getByText("Categorías:")).toBeVisible();
  await expect(page.getByText("Plataformas:")).toBeVisible();
});

test("Eliminar videojuego desde detalle lo quita del listado", async ({ page }) => {
  const user = uniqueUser();
  const gameName = uniqueGameName();

  await register(page, user);
  await page.goto("/juegos/nuevo");

  await page.getByLabel("Nombre").fill(gameName);
  await page.getByLabel("Descripción").fill("Juego para borrar en E2E");
  await page.getByLabel("Precio").fill("11.50");
  await page.getByLabel("Categorías IDs separadas por coma (ej: 1,2)").fill("1");
  await page.getByLabel("Plataformas IDs separadas por coma (ej: 1,3)").fill("1");
  await page.getByRole("button", { name: "Guardar" }).click();

  await expect(page).toHaveURL(/\/mis-juegos$/);
  const row = page.locator(".MuiCard-root", { hasText: gameName }).first();
  await row.getByRole("link", { name: "Ver detalle" }).click();

  await expect(page).toHaveURL(/\/juegos\/\d+$/);
  await page.getByRole("button", { name: "Eliminar videojuego" }).click();

  await expect(page).toHaveURL(/\/mis-juegos$/);
  await expect(page.getByText(gameName)).toHaveCount(0);
});

test("Logout bloquea rutas protegidas", async ({ page }) => {
  const user = uniqueUser();

  await register(page, user);
  await page.getByRole("button", { name: "Cerrar sesión" }).click();

  await page.goto("/mis-juegos");
  await expect(page).toHaveURL(/\/login$/);
});
