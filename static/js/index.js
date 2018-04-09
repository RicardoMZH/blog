//mobile-top-menu-archives switch
$(function(){
    $("#mobile-link").click(function(){
        $("#mobile-top-menu-archives").slideToggle();
    })
})
$(function(){
    $("#mobile-link").blur(function(){
        $("#mobile-top-menu-archives").slideUp();
    })
})
$(function(){
    $("#search").click(function(){
        if ($("#searchform-top").hasClass('searchform-top-active')) {
            $("#searchform-top").removeClass('searchform-top-active');
            $("#searchform-top").animate({width:'0px'},210);
        }else{
            $("#searchform-top").addClass('searchform-top-active');
            $("#searchform-top").animate({width:$('#user-link-div').width()},210);
        }
    })
})
$(function(){
    $("#mobile-search").click(function(){
        if ($("#mobile-searchform-top").hasClass('mobile-searchform-top-active')) {
            $("#mobile-searchform-top").removeClass('mobile-searchform-top-active');
            $("#mobile-searchform-top").animate({width:'0px'},210);
        }else{
            $("#mobile-searchform-top").addClass('mobile-searchform-top-active');
            $("#mobile-searchform-top").animate({width:$('#mobile-user-link-div').width()},210);
        }
    })
})
//mobile-top-menu-archives switch end

// scroll-down
$(function(){
    $("#scroll-down").click(function(){
        $("html,body").animate({scrollTop:$("main").offset().top}, 800);
    })
})
// scroll-down end

// go_top
$(function(){
    $("#go-top img").click(function(){
        $("html,body").animate({scrollTop:0}, 600);
    })
})
$(function(){
    $(window).scroll(function() {
        var scrollY = $(document).scrollTop();
        if (scrollY <= ($('#about-me').outerHeight(true) + $('#top-div').outerHeight(true))){
            $('#go-top').removeClass('go-top-show');
            $('#go-top').addClass('go-top-hiddened');
        }
        else {
            $('#go-top').removeClass('go-top-hiddened');
            $('#go-top').addClass('go-top-show');
        }
     });
});
// go_top end

//hitokoto_api
function hitokoto_api(all_type) {
    if (all_type) {
        var url = "https://sslapi.hitokoto.cn/?encode=json";
    }else {
        var seed = String.fromCharCode(Math.floor(Math.random()*3+97));
        var url = "https://sslapi.hitokoto.cn/?c=" + seed + "&encode=json";
    }
    $.get(url,function(data,status){
        // var hitokoto = $.parseJSON(data);
        // var hitokoto_text = hitokoto['hitokoto'] + "<br> ———— 《" + hitokoto['from'] + "》";
        var hitokoto_text = data['hitokoto'] + "<br> ———— 《" + data['from'] + "》";
        $("#hitokoto-text").html(hitokoto_text);
        $("#mobile-hitokoto-text").html(hitokoto_text);
    });
}
//hitokoto_api end

//side-menu height
$(function(){
    function resizehandler(){
        $("#mobile-top-menu-tools-div").height($('#main-div').height());
        $("#hitokoto-div").innerHeight($('#blog-div').innerHeight()-$('#about-me').outerHeight(true));
    }
    resizehandler();
    $(window).resize(resizehandler);
});
//side-menu height end

//footnote
function change_md_style(argument) {
    $(".article-view a").each(function () {
        if ($(this).attr('href')[0]=='#') {
            $(this).wrap("<sup></sup>");
            $(this).attr('href','javascripts::;');
            $(this).click(function(){
                $("html,body").animate({scrollTop:$('#footnote-').offset().top}, 800);
            })
        }
    })
}
//footnote end
function add_img_alt(argument) {
    $("p img").each(function () {
        if ($(this).attr('alt')!=undefined && $(this).attr('alt')!='') {
            $(this).after("<div class='image-caption-div'><span class='image-caption'>"+ $(this).attr('alt')+ "</span></div>");
            $(this).wrap("<a href='" + $(this).attr('src') + "' data-fancybox='group' data-caption='" + $(this).attr('alt') + "'></a>");
        }else{
            $(this).wrap("<a href='" + $(this).attr('src') + "' data-fancybox='group'></a>");
        }
    })
}
//funcution call
(function(){
      document.onreadystatechange = function(){
        NProgress.start();
        if(document.readyState == "loading"){
          NProgress.set(1);
        }
        if(document.readyState == "Interactive"){
          NProgress.set(0.5);
        }
        if(document.readyState == "complete"){
          NProgress.done();
        }
      }
  })();
$(document).ready(function(){
    hitokoto_api(true);
    change_md_style();
    add_img_alt();
    $("[data-fancybox]").fancybox({
        loop:true,
        arrows : false,
        infobar : false,
        toolbar : false,
        smallBtn : 'true',
        backFocus : false,
        trapFocus : false,
    });
    $('hr').replaceWith('<div class="or-spacer"><div class="mask"></div><span><i>Next</i></span></div>');
})
//funcution call end
