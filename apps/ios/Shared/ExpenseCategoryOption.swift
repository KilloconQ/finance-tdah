import AppIntents

/// The expense categories as Siri and Shortcuts offer them. Raw values are what the API stores.
enum ExpenseCategoryOption: String, AppEnum {
    case comida
    case cafe = "café"
    case transporte
    case supermercado = "super"
    case salidas
    case salud
    case casa
    case suscripciones = "subs"
    case otro

    static let typeDisplayRepresentation: TypeDisplayRepresentation = "Categoría"

    static let caseDisplayRepresentations: [ExpenseCategoryOption: DisplayRepresentation] = [
        .comida: "Comida",
        .cafe: "Café",
        .transporte: "Transporte",
        .supermercado: "Súper",
        .salidas: "Salidas",
        .salud: "Salud",
        .casa: "Casa",
        .suscripciones: "Suscripciones",
        .otro: "Otro",
    ]
}
