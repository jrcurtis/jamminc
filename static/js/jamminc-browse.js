
$(function (event) {
    var deleteItem = function (API_URL, id, name, $element) {
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

    var rate = function (up) {
        $.ajax({
            url: "/jamminc/music/rate.json",
            type: "POST",
            data: {
                song_id: $("#song-id").text(),
                inst_id: $("#inst-id").text(),
                up: up
            },
            succes: function (data, textStatus, jqXHR) {
                if (data.error) {
                    mw.flash("Couldn't rate: " + data.error);
                } else {
                    $(up ? ".thumbs-up" : ".thumbs-down").addClass("active");
                    mw.flash("Thanks for rating");
                }
            },
            error: function () {
                mw.flash("Couldn't rate: Server error");
            }
        });
    };

    var favorite = function () {
        $.ajax({
            url: "/jamminc/music/favorite.json",
            type: "POST",
            data: {

            },
            success: function (data, textStatus, jqXHR) {
                if (data.error) {
                    mw.flash("Couldn't favorite: " + data.error);
                } else {
                    $(".favorite").addClass("active");
                    mw.flash("Favorited");
                }
            },
            error: function () {
                mw.flash("Couldn't favorite: Server error");
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
                            deleteItem(API_URL, $(this).text(), name, $li);
                            return false;
                        });
                });
        });

    $(".thumbs-up")
        .click(function () {
            rate(true);
        });

    $(".thumbs-down")
        .click(function () {
            rate(false);
        });

    $(".favorite")
        .click(function () {
            favorite();
        });
});
