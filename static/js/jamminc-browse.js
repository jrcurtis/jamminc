
$(function (event) {
    var delete_item = function (API_URL, id, name, $element) {
        $.ajax({
            url: API_URL + "?" + $.param({ id: id }),
            type: "DELETE",
            success: function (data, textStatus, jqXHR) {
                mw.flash(name + " deleted");
                $element.fadeOut().detach();
            }
        });
    };

    $(".music-list")
        .each(function (i) {
            var type, name;
            if ($(this).hasClass("songs")) {
                type = "songs";
                name = "Song";
            } else if ($(this).hasClass("instruments")) {
                type = "instruments";
                name = "Instrument";
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
