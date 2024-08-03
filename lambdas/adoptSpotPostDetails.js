const { CognitoJwtVerifier } = require("aws-jwt-verify");
const AWS = require("aws-sdk");

AWS.config.update({
  region: "ca-central-1",
});
const dynamoDBTableName = "AdoptionPost";
const dynamoDB = new AWS.DynamoDB.DocumentClient();

const verifier = CognitoJwtVerifier.create({
  userPoolId: "ca-central-1_2EMwO6zh4",
  tokenUse: "id",
  clientId: "33jeoi98li5bdpv2m88jovvdgh",
});

exports.handler = async (event) => {
  let response;

  try {
    const payload = await verifier.verify(event.headers.Authorization);
    switch (event.httpMethod) {
      case "POST":
        response = await saveUser(JSON.parse(event.body), payload.sub);
        break;
      case "GET":
        response = await getUsers(payload.sub);
        break;
      case "DELETE":
        response = await deleteUser(JSON.parse(event.body).id);
        break;
      default:
        response = buildResponse(404, "404 Not Found");
    }
  } catch (err) {
    response = buildResponse(400, {
      success: false,
      message: err,
    });
  }

  return response;
};

async function deleteUser(id) {
  try {
    // Step 1: Delete the record from the AdoptionPost table
    const deletePostParams = {
      TableName: dynamoDBTableName,
      Key: {
        id: id,
      },
      returnValues: "ALL_OLD",
    };
    const deletedPost = await dynamoDB.delete(deletePostParams).promise();

    // Step 2: Delete records from the other two tables using postId
    await deleteFromTable1(id);
    await deleteFromTable2(id);

    const body = {
      Operation: "DELETE",
      Message: "SUCCESS",
      DeletedPost: deletedPost,
    };
    return buildResponse(200, body);
  } catch (error) {
    console.log(error);
    return buildResponse(500, "Internal Server Error");
  }
}

async function deleteFromTable1(postId) {
  // Implement the logic to query and find records in Table1 based on postId
  // Example:
  const params = {
    TableName: "AdoptionFavorites",
    FilterExpression: "postId = :postId",
    ExpressionAttributeValues: {
      ":postId": postId,
    },
  };
  const recordsToDelete = await dynamoDB.scan(params).promise();

  // Delete each record from Table1
  const deletePromises = recordsToDelete.Items.map((item) => {
    const deleteParams = {
      TableName: "AdoptionFavorites",
      Key: {
        // Assuming 'id' is the primary key in Table1
        id: item.id,
      },
    };
    return dynamoDB.delete(deleteParams).promise();
  });

  // Wait for all delete operations to complete
  await Promise.all(deletePromises);
}

async function deleteFromTable2(postId) {
  // Implement the logic to query and find records in Table2 based on postId
  // Example:
  const params = {
    TableName: "AdoptionRequest",
    FilterExpression: "postId = :postId",
    ExpressionAttributeValues: {
      ":postId": postId,
    },
  };
  const recordsToDelete = await dynamoDB.scan(params).promise();

  // Delete each record from Table2
  const deletePromises = recordsToDelete.Items.map((item) => {
    const deleteParams = {
      TableName: "AdoptionRequest",
      Key: {
        // Assuming 'id' is the primary key in Table2
        id: item.id,
      },
    };
    return dynamoDB.delete(deleteParams).promise();
  });

  // Wait for all delete operations to complete
  await Promise.all(deletePromises);
}

async function getUsers(userId) {
  const params = {
    TableName: dynamoDBTableName,
    FilterExpression: "userId = :id",
    ExpressionAttributeValues: {
      ":id": userId,
    },
  };
  try {
    const user = await dynamoDB
      .get({
        TableName: "AdoptionUser",
        Key: {
          id: userId,
        },
      })
      .promise();

    const allUsers = await dynamoDB.scan(params).promise();
    const body = {
      users: allUsers,
      userInitial: user.Item.firstName.charAt(0).toUpperCase(),
    };
    return buildResponse(200, body);
  } catch (error) {
    console.log(error);
    return buildResponse(500, "Internal Server Error");
  }
}

async function saveUser(requestBody, userId) {
  const { imageUrl, dogName, location, description, age, gender, type, breed, medicalHistory } =
    requestBody;
  if (
    !dogName ||
    !location ||
    !description ||
    !imageUrl ||
    !age ||
    !gender ||
    !type ||
    !breed ||
    !medicalHistory ||
    !userId
  ) {
    return buildResponse(400, "Missing required fields");
  }

  const date = new Date();
  const month = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const userItem = {
    id: generateUniqueId(),
    userId: userId,
    name: dogName,
    location: location,
    description: description,
    imageUrl: imageUrl,
    age: age,
    gender: gender,
    animalType: type,
    breed: breed,
    medicalHistory: medicalHistory,
    createdAt: `${date.getDate()}-${month[date.getMonth()]}-${date.getFullYear()}`,
  };
  const params = {
    TableName: dynamoDBTableName,
    Item: userItem,
  };

  try {
    await dynamoDB.put(params).promise();
    const response = {
      Operation: "SAVE",
      Message: "SUCCESS",
      Item: userItem,
    };
    return buildResponse(200, response);
  } catch (error) {
    console.error("Error saving to DynamoDB:", error);
    return buildResponse(500, "Internal Server Error");
  }
}

function buildResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
    },
    body: JSON.stringify(body),
  };
}

function generateUniqueId() {
  const crypto = require("crypto");
  const buffer = crypto.randomBytes(16);
  return buffer.toString("hex");
}
