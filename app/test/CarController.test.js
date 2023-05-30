const dayjs = require("dayjs");
const CarController = require("../controllers/CarController");

describe('CarController', () => {
  let carController;
  let carModelMock;
  let userCarModelMock;
  let dayjsMock;
  let reqMock;
  let resMock;
  let nextMock;

  beforeEach(() => {
    carModelMock = {};
    userCarModelMock = {};
    dayjsMock = jest.fn();

    carController = new CarController({
      carModel: carModelMock,
      userCarModel: userCarModelMock,
      dayjs: dayjsMock,
    });

    reqMock = {
      params: {
        id: 1,
      },
      query: {
        pageSize: 10,
      },
      user: {
        id: 1,
      },
    };

    resMock = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      end: jest.fn(),
    };

    nextMock = jest.fn();
  });

  describe('handleListCars', () => {
    test('should return cars and pagination meta', async () => {
      const cars = [{ id: 1, name: 'Car 1' }, { id: 2, name: 'Car 2' }];
      const carCount = 2;
      carModelMock.findAll = jest.fn().mockResolvedValue(cars);
      carModelMock.count = jest.fn().mockResolvedValue(carCount);
      carController.buildPaginationObject = jest.fn().mockReturnValue({});

      await carController.handleListCars(reqMock, resMock);

      expect(resMock.status).toHaveBeenCalledWith(200);
      expect(resMock.json).toHaveBeenCalledWith({
        cars,
        meta: {
          pagination: {},
        },
      });
      expect(carModelMock.findAll).toHaveBeenCalledWith(expect.any(Object));
      expect(carModelMock.count).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('handleGetCar', () => {
    test('should return car', async () => {
      const car = { id: 1, name: 'Car 1' };
      carModelMock.findByPk = jest.fn().mockResolvedValue(car);

      await carController.handleGetCar(reqMock, resMock);

      expect(resMock.status).toHaveBeenCalledWith(200);
      expect(resMock.json).toHaveBeenCalledWith(car);
      expect(carModelMock.findByPk).toHaveBeenCalledWith(reqMock.params.id);
    });
  });

  describe('handleCreateCar', () => {
    test('should create a car', async () => {
      const newCar = { name: 'Car 1', price: 1000, size: 'Medium', image: 'car.jpg' };
      const createdCar = { id: 1, ...newCar, isCurrentlyRented: false };
      carModelMock.create = jest.fn().mockResolvedValue(createdCar);

      reqMock.body = newCar;

      await carController.handleCreateCar(reqMock, resMock);

      expect(resMock.status).toHaveBeenCalledWith(201);
      expect(resMock.json).toHaveBeenCalledWith(createdCar);
      expect(carModelMock.create).toHaveBeenCalledWith({
        name: newCar.name,
        price: newCar.price,
        size: newCar.size,
        image: newCar.image,
        isCurrentlyRented: false,
      });
    });

    test('should handle create car error', async () => {
      const error = new Error('Error creating car');
      carModelMock.create = jest.fn().mockRejectedValue(error);

      reqMock.body = { name: 'Car 1', price: 1000, size: 'Medium', image: 'car.jpg' };

      await carController.handleCreateCar(reqMock, resMock);

      expect(resMock.status).toHaveBeenCalledWith(422);
      expect(resMock.json).toHaveBeenCalledWith({
        error: {
          name: error.name,
          message: error.message,
        }
      });
      expect(carModelMock.create).toHaveBeenCalledWith({
        name: reqMock.body.name,
        price: reqMock.body.price,
        size: reqMock.body.size,
        image: reqMock.body.image,
        isCurrentlyRented: false,
      });
    });
  });

  describe('handleRentCar', () => {
    test('should create a userCar', async () => {
      const rentStartedAt = dayjs().format();
      const rentEndedAt = dayjs().add(1, 'day').format();
      const car = { id: 1, name: 'Car 1' };
      const userCar = { id: 1, carId: car.id, rentStartedAt, rentEndedAt };
      userCarModelMock.findOne = jest.fn().mockResolvedValue(null);
      userCarModelMock.create = jest.fn().mockResolvedValue(userCar);
      carController.getCarFromRequest = jest.fn().mockResolvedValue(car);

      reqMock.body = { rentStartedAt, rentEndedAt };

      await carController.handleRentCar(reqMock, resMock, nextMock);

      expect(resMock.status).toHaveBeenCalledWith(201);
      expect(resMock.json).toHaveBeenCalledWith(userCar);
      expect(userCarModelMock.findOne).toHaveBeenCalledWith({
        where: {
          carId: car.id,
          rentStartedAt: {
            [Op.gte]: rentStartedAt,
          },
          rentEndedAt: {
            [Op.lte]: rentEndedAt,
          },
        },
      });
      expect(userCarModelMock.create).toHaveBeenCalledWith({
        userId: reqMock.user.id,
        carId: car.id,
        rentStartedAt,
        rentEndedAt,
      });
    });

    test('should handle active rent error', async () => {
      const rentStartedAt = dayjs().format();
      const rentEndedAt = dayjs().add(1, 'day').format();
      const car = { id: 1, name: 'Car 1' };
      const activeRent = { id: 1, carId: car.id, rentStartedAt, rentEndedAt };
      userCarModelMock.findOne = jest.fn().mockResolvedValue(activeRent);
      carController.getCarFromRequest = jest.fn().mockResolvedValue(car);

      reqMock.body = { rentStartedAt, rentEndedAt };

      await carController.handleRentCar(reqMock, resMock, nextMock);

      const expectedError = new CarAlreadyRentedError(car);

      expect(resMock.status).toHaveBeenCalledWith(422);
      expect(resMock.json).toHaveBeenCalledWith(expectedError);
      expect(userCarModelMock.findOne).toHaveBeenCalledWith({
        where: {
          carId: car.id,
          rentStartedAt: {
            [Op.gte]: rentStartedAt,
          },
          rentEndedAt: {
            [Op.lte]: rentEndedAt,
          },
        },
      });
      expect(userCarModelMock.create).not.toHaveBeenCalled();
    });

    test('should handle rent car error', async () => {
      const rentStartedAt = dayjs().format();
      const rentEndedAt = dayjs().add(1, 'day').format();
      const car = { id: 1, name: 'Car 1' };
      const error = new Error('Error renting car');
      userCarModelMock.findOne = jest.fn().mockResolvedValue(null);
      userCarModelMock.create = jest.fn().mockRejectedValue(error);
      carController.getCarFromRequest = jest.fn().mockResolvedValue(car);

      reqMock.body = { rentStartedAt, rentEndedAt };

      await carController.handleRentCar(reqMock, resMock, nextMock);

      expect(nextMock).toHaveBeenCalledWith(error);
      expect(userCarModelMock.findOne).toHaveBeenCalledWith({
        where: {
          carId: car.id,
          rentStartedAt: {
            [Op.gte]: rentStartedAt,
          },
          rentEndedAt: {
            [Op.lte]: rentEndedAt,
          },
        },
      });
      expect(userCarModelMock.create).toHaveBeenCalledWith({
        userId: reqMock.user.id,
        carId: car.id,
        rentStartedAt,
        rentEndedAt,
      });
    });
  });

  describe('handleUpdateCar', () => {
    test('should update a car', async () => {
      const updatedCar = { id: 1, name: 'Updated Car 1' };
      const car = { id: 1, name: 'Car 1', update: jest.fn().mockResolvedValue(updatedCar) };
      carController.getCarFromRequest = jest.fn().mockResolvedValue(car);

      reqMock.body = { name: 'Updated Car 1', price: 2000, size: 'Large', image: 'updated_car.jpg' };

      await carController.handleUpdateCar(reqMock, resMock);

      expect(resMock.status).toHaveBeenCalledWith(200);
      expect(resMock.json).toHaveBeenCalledWith(updatedCar);
      expect(car.update).toHaveBeenCalledWith({
        name: reqMock.body.name,
        price: reqMock.body.price,
        size: reqMock.body.size,
        image: reqMock.body.image,
        isCurrentlyRented: false,
      });
    });

    test('should handle update car error', async () => {
      const error = new Error('Error updating car');
      const car = { id: 1, name: 'Car 1', update: jest.fn().mockRejectedValue(error) };
      carController.getCarFromRequest = jest.fn().mockResolvedValue(car);

      reqMock.body = { name: 'Updated Car 1', price: 2000, size: 'Large', image: 'updated_car.jpg' };

      await carController.handleUpdateCar(reqMock, resMock);

      expect(resMock.status).toHaveBeenCalledWith(422);
      expect(resMock.json).toHaveBeenCalledWith({
        error: {
          name: error.name,
          message: error.message,
        }
      });
      expect(car.update).toHaveBeenCalledWith({
        name: reqMock.body.name,
        price: reqMock.body.price,
        size: reqMock.body.size,
        image: reqMock.body.image,
        isCurrentlyRented: false,
      });
    });
  });

  describe('handleDeleteCar', () => {
    test('should delete a car', async () => {
      const car = { id: 1, destroy: jest.fn().mockResolvedValue(1) };
      carModelMock.destroy = jest.fn().mockResolvedValue(car);

      await carController.handleDeleteCar(reqMock, resMock);

      expect(carModelMock.destroy).toHaveBeenCalledWith(reqMock.params.id);
      expect(resMock.status).toHaveBeenCalledWith(204);
      expect(resMock.end).toHaveBeenCalled();
    });
  });

  describe('getCarFromRequest', () => {
    test('should return car by id', async () => {
      const car = { id: 1, name: 'Car 1' };
      carModelMock.findByPk = jest.fn().mockResolvedValue(car);

      const result = await carController.getCarFromRequest(reqMock);

      expect(carModelMock.findByPk).toHaveBeenCalledWith(reqMock.params.id);
      expect(result).toBe(car);
    });
  });

  describe('getListPaginationOptions', () => {
    test('should return pagination options', () => {
      const pageSize = 10;
      const offset = 0;
      const limit = pageSize;
      const options = carController.getListPaginationOptions(reqMock.query);

      expect(options.offset).toBe(offset);
      expect(options.limit).toBe(limit);
    });
  });

  describe('buildPaginationObject', () => {
    test('should return pagination object', () => {
      const pageSize = 10;
      const totalCount = 20;
      const totalPages = Math.ceil(totalCount / pageSize);
      const pagination = carController.buildPaginationObject(reqMock.query, totalCount);

      expect(pagination.currentPage).toBe(1);
      expect(pagination.pageSize).toBe(pageSize);
      expect(pagination.totalCount).toBe(totalCount);
      expect(pagination.totalPages).toBe(totalPages);
    });
  });
});
