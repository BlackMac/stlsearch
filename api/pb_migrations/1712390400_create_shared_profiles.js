/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = new Collection({
    name: "shared_profiles",
    type: "base",
    system: false,
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: null,
    fields: [
      {
        type: "text",
        name: "slug",
        required: true,
      },
      {
        type: "json",
        name: "settings",
      },
      {
        type: "json",
        name: "favorites",
      },
      {
        type: "json",
        name: "stats",
      },
      {
        type: "autodate",
        name: "created",
        onCreate: true,
        onUpdate: false,
      },
      {
        type: "autodate",
        name: "updated",
        onCreate: true,
        onUpdate: true,
      },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_shared_profiles_slug ON shared_profiles (slug)"
    ],
  });

  app.saveNoValidate(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("shared_profiles");
  app.delete(collection);
});
