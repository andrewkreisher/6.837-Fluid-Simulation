#version 330 core

out vec4 frag_color;

struct AmbientLight {
    bool enabled;
    vec3 ambient;
};

struct PointLight {
    bool enabled;
    vec3 position;
    vec3 diffuse;
    vec3 specular;
    vec3 attenuation;
};

struct DirectionalLight {
    bool enabled;
    vec3 direction;
    vec3 diffuse;
    vec3 specular;
};
struct Material {
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
    float shininess;
};

in vec3 world_position;
in vec3 world_normal;
in vec2 tex_coord;

uniform vec3 camera_position;

uniform Material material; // material properties of the object
uniform AmbientLight ambient_light;
uniform PointLight point_light; 
uniform DirectionalLight directional_light;
uniform sampler2D s_sampler;
uniform sampler2D a_sampler;
uniform sampler2D d_sampler;
uniform bool a_texture; 
uniform bool d_texture; 
uniform bool s_texture; 
uniform sampler2D shadow_sampler;
uniform mat4 world_to_light_ndc_matrix;
uniform mat4 model_matrix; 
vec3 CalcAmbientLight();
vec3 CalcPointLight(vec3 normal, vec3 view_dir);
vec3 CalcDirectionalLight(vec3 normal, vec3 view_dir);

void main() {
    vec3 normal = normalize(world_normal);
    vec3 view_dir = normalize(camera_position - world_position);

    frag_color = vec4(0.0);

    if (ambient_light.enabled) {
        frag_color += vec4(CalcAmbientLight(), 1.0);
    }
    
    if (point_light.enabled) {
        frag_color += vec4(CalcPointLight(normal, view_dir), 1.0);
    }

    if (directional_light.enabled) {
        
        frag_color += vec4(CalcDirectionalLight(normal, view_dir), 1.0);
    }
}

vec3 GetAmbientColor() {
    if(a_texture){
        vec4 color = texture(a_sampler, tex_coord);
        return vec3(color);
    } else {
        return material.ambient;
    }
    
}

vec3 GetDiffuseColor() {
    if(d_texture){
        vec4 color = texture(d_sampler, tex_coord);
        return vec3(color);
    } else {
        return material.diffuse;
    }
}

vec3 GetSpecularColor() {
    if(s_texture){
        vec4 color = texture(s_sampler, tex_coord);
        return vec3(color);
    } else {
        return material.specular;
    };
}

vec3 CalcAmbientLight() {
    return ambient_light.ambient * GetAmbientColor();
}

vec3 CalcPointLight(vec3 normal, vec3 view_dir) {
    PointLight light = point_light;
    vec3 light_dir = normalize(light.position - world_position);

    float diffuse_intensity = max(dot(normal, light_dir), 0.0);
    vec3 diffuse_color = diffuse_intensity * light.diffuse * GetDiffuseColor();

    vec3 reflect_dir = reflect(-light_dir, normal);
    float specular_intensity = pow(
        max(dot(view_dir, reflect_dir), 0.0), material.shininess);
    vec3 specular_color = specular_intensity * 
        light.specular * GetSpecularColor();

    float distance = length(light.position - world_position);
    float attenuation = 1.0 / (light.attenuation.x + 
        light.attenuation.y * distance + 
        light.attenuation.z * (distance * distance));

    return attenuation * (diffuse_color + specular_color);
}

vec3 CalcDirectionalLight(vec3 normal, vec3 view_dir) {
    DirectionalLight light = directional_light;
    vec3 light_dir = normalize(-light.direction);
    float diffuse_intensity = max(dot(normal, light_dir), 0.0);
    vec3 diffuse_color = diffuse_intensity * light.diffuse * GetDiffuseColor();

    vec3 reflect_dir = reflect(-light_dir, normal);
    float specular_intensity = pow(
        max(dot(view_dir, reflect_dir), 0.0), material.shininess);
    vec3 specular_color = specular_intensity * 
        light.specular * GetSpecularColor();

    
    vec4 pre = world_to_light_ndc_matrix * vec4(world_position, 1.0);
    vec3 x_tex = pre.xyz;
    vec2 tex_xy = vec2((x_tex.x + 1.0f)/2.0f, (x_tex.y + 1.0f)/2.0f);
    float this_d = (x_tex.z + 1.0f)/2.0f;
    float occ_d = texture(shadow_sampler, tex_xy).x; 
    vec3 color;
    if (occ_d + 0.01 < this_d) {
      color = vec3(0.0);
    } else {
      color = diffuse_color + specular_color;
    }

    return color;
}

 