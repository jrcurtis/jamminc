
$(function (event) {
    var delete_item = function (API_URL, id, name, $element) {
        if (!confirm("Are you sure you want to delete this " + name + "?")) {
            return;
        }

        $.ajax({
            url: API_URL + "?" + $.param({ id: id }),
            type: "DELETE",
            success: function (data, textStatus, jqXHR) {
                mw.flash(mw.capitalize(name) + " deleted");
                $element.fadeOut();
            }
        });
    };

    $(".music-list")
        .each(function (i) {
            var type, name;
            if ($(this).hasClass("songs")) {
                type = "songs";
                name = "song";
            } else if ($(this).hasClass("instruments")) {
                type = "instruments";
                name = "instrument";
            }
            
            var API_URL = "/jamminc/music/" + type + ".json";
            $(this)
                .find(".close")
                .each(function (i) {
                    $(this)
                        .click(function (event) {
                            var $li = $(this).parents("li").first();
                            delete_item(API_URL, $(this).text(), name, $li);
                            return false;
                        });
                });
        });
});
